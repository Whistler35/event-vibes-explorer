/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: Props) => (
  <EvendleLayout preview="Dein EVENDLE Login-Link">
    <Text style={styles.h1}>Dein Login-Link ⚡</Text>
    <Text style={styles.text}>
      Klicke auf den Button unten, um dich bei EVENDLE anzumelden — kein Passwort
      nötig.
    </Text>
    <Section style={styles.buttonWrap}>
      <Button href={confirmationUrl} style={styles.button}>
        Bei EVENDLE anmelden
      </Button>
    </Section>
    <Text style={styles.hint}>
      Wenn du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail
      einfach ignorieren.
    </Text>
    <Text style={styles.linkFallback}>{confirmationUrl}</Text>
  </EvendleLayout>
)

export const subject = 'Dein EVENDLE Login-Link'
