/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface LayoutProps {
  preview: string
  children: React.ReactNode
}

export const EvendleLayout = ({ preview, children }: LayoutProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={container}>
        {/* Header / Wordmark */}
        <Section style={header}>
          <Text style={wordmark}>EVENDLE</Text>
        </Section>

        {/* Main content card */}
        <Section style={card}>{children}</Section>

        {/* Lime accent bar */}
        <Section style={accentBar} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Du bekommst diese E-Mail, weil du dich bei EVENDLE registriert hast.
          </Text>
          <Text style={footerText}>
            <Link href="https://evendle.com" style={footerLink}>
              evendle.com
            </Link>
            {' · '}
            <Link href="mailto:hallo@evendle.com" style={footerLink}>
              hallo@evendle.com
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footerSmall}>© {new Date().getFullYear()} EVENDLE</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const body = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '32px 0',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(23, 53, 24, 0.08)',
}

const header = {
  backgroundColor: '#f4f4bb',
  padding: '32px 32px 28px',
  textAlign: 'center' as const,
}

const wordmark = {
  fontSize: '32px',
  fontWeight: 800 as const,
  letterSpacing: '4px',
  color: '#173518',
  margin: 0,
  lineHeight: 1,
}

const card = {
  padding: '36px 32px 32px',
  backgroundColor: '#ffffff',
}

const accentBar = {
  height: '6px',
  backgroundColor: '#d8d87a',
}

const footer = {
  padding: '24px 32px 28px',
  backgroundColor: '#ffffff',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '4px 0',
  lineHeight: 1.5,
}

const footerLink = {
  color: '#173518',
  textDecoration: 'none',
  fontWeight: 600 as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '16px 0 12px',
}

const footerSmall = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: 0,
}

// Shared styles for content
export const styles = {
  h1: {
    fontSize: '24px',
    fontWeight: 700 as const,
    color: '#173518',
    margin: '0 0 16px',
    lineHeight: 1.3,
  },
  text: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  buttonWrap: {
    textAlign: 'center' as const,
    margin: '28px 0',
  },
  button: {
    backgroundColor: '#173518',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    textDecoration: 'none',
    padding: '14px 32px',
    borderRadius: '10px',
    display: 'inline-block',
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: '20px 0 0',
  },
  linkFallback: {
    fontSize: '12px',
    color: '#173518',
    wordBreak: 'break-all' as const,
    margin: '4px 0 0',
  },
  codeBox: {
    backgroundColor: '#f4f4bb',
    border: '2px solid #d8d87a',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  code: {
    fontSize: '32px',
    fontWeight: 700 as const,
    color: '#173518',
    letterSpacing: '6px',
    margin: 0,
    fontFamily: 'monospace',
  },
}
