// EVENDLE Auth Email Hook
// Receives Supabase Auth webhook events, renders branded German templates,
// and sends them via Resend API from hallo@evendle.com.

import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { renderAsync } from 'npm:@react-email/render@0.0.17'
import * as React from 'npm:react@18.3.1'

import { SignupEmail, subject as signupSubject } from '../_shared/email-templates/signup.tsx'
import { RecoveryEmail, subject as recoverySubject } from '../_shared/email-templates/recovery.tsx'
import { MagicLinkEmail, subject as magicSubject } from '../_shared/email-templates/magic-link.tsx'
import { EmailChangeEmail, subject as changeSubject } from '../_shared/email-templates/email-change.tsx'
import { InviteEmail, subject as inviteSubject } from '../_shared/email-templates/invite.tsx'
import { ReauthenticationEmail, subject as reauthSubject } from '../_shared/email-templates/reauthentication.tsx'

const FROM = 'EVENDLE <hallo@evendle.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

interface AuthEmailPayload {
  user: {
    email: string
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type:
      | 'signup'
      | 'recovery'
      | 'magiclink'
      | 'invite'
      | 'email_change'
      | 'email_change_current'
      | 'email_change_new'
      | 'reauthentication'
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

function buildConfirmationUrl(payload: AuthEmailPayload): string {
  const { token_hash, email_action_type, redirect_to, site_url } = payload.email_data
  const base = site_url.replace(/\/$/, '')
  const params = new URLSearchParams({
    token: token_hash,
    type: email_action_type,
    redirect_to: redirect_to || base,
  })
  return `${base}/auth/v1/verify?${params.toString()}`
}

async function renderEmail(payload: AuthEmailPayload): Promise<{ subject: string; html: string }> {
  const url = buildConfirmationUrl(payload)
  const action = payload.email_data.email_action_type

  switch (action) {
    case 'signup':
      return {
        subject: signupSubject,
        html: await renderAsync(React.createElement(SignupEmail, { confirmationUrl: url })),
      }
    case 'recovery':
      return {
        subject: recoverySubject,
        html: await renderAsync(React.createElement(RecoveryEmail, { confirmationUrl: url })),
      }
    case 'magiclink':
      return {
        subject: magicSubject,
        html: await renderAsync(React.createElement(MagicLinkEmail, { confirmationUrl: url })),
      }
    case 'invite':
      return {
        subject: inviteSubject,
        html: await renderAsync(React.createElement(InviteEmail, { confirmationUrl: url })),
      }
    case 'email_change':
    case 'email_change_current':
    case 'email_change_new':
      return {
        subject: changeSubject,
        html: await renderAsync(
          React.createElement(EmailChangeEmail, {
            confirmationUrl: url,
            email: payload.user.email,
          })
        ),
      }
    case 'reauthentication':
      return {
        subject: reauthSubject,
        html: await renderAsync(
          React.createElement(ReauthenticationEmail, { token: payload.email_data.token })
        ),
      }
    default:
      // Fallback: use signup template
      return {
        subject: signupSubject,
        html: await renderAsync(React.createElement(SignupEmail, { confirmationUrl: url })),
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET is not configured')
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured')
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.text()
    const headers = Object.fromEntries(req.headers)

    // Verify webhook signature (Standard Webhooks spec)
    // Supabase stores the secret as "v1,whsec_<base64>". The standardwebhooks
    // library expects the secret WITH the "whsec_" prefix (it strips it internally).
    const secretForLib = hookSecret.replace(/^v1,/, '')
    const wh = new Webhook(secretForLib)
    const payload = wh.verify(body, headers) as AuthEmailPayload

    console.log('Auth email hook:', {
      action: payload.email_data.email_action_type,
      to: payload.user.email,
    })

    const { subject, html } = await renderEmail(payload)

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.user.email],
        subject,
        html,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('Resend API error:', resp.status, errText)
      return new Response(
        JSON.stringify({ error: `Resend send failed (${resp.status}): ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await resp.json()
    console.log('Email sent successfully:', result.id)

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('auth-email-hook error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
