/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: Props) => (
  <EvendleLayout preview="Du wurdest zu EVENDLE eingeladen">
    <Text style={styles.h1}>Du bist eingeladen! 🎊</Text>
    <Text style={styles.text}>
      Jemand hat dich zu EVENDLE eingeladen — der App, mit der du Events in
      deiner Stadt entdeckst und neue Leute triffst.
    </Text>
    <Section style={styles.buttonWrap}>
      <Button href={confirmationUrl} style={styles.button}>
        Einladung annehmen
      </Button>
    </Section>
    <Text style={styles.hint}>
      Falls du nicht weißt, wovon hier die Rede ist, ignoriere diese E-Mail
      einfach.
    </Text>
    <Text style={styles.linkFallback}>{confirmationUrl}</Text>
  </EvendleLayout>
)

export const subject = 'Du wurdest zu EVENDLE eingeladen'
