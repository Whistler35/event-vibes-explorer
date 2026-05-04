/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: Props) => (
  <EvendleLayout preview="Willkommen bei EVENDLE — bestätige deine E-Mail-Adresse">
    <Text style={styles.h1}>Willkommen bei EVENDLE! 🎉</Text>
    <Text style={styles.text}>
      Schön, dass du dabei bist! Bitte bestätige deine E-Mail-Adresse, um dein
      Konto zu aktivieren und loszulegen.
    </Text>
    <Section style={styles.buttonWrap}>
      <Button href={confirmationUrl} style={styles.button}>
        E-Mail bestätigen
      </Button>
    </Section>
    <Text style={styles.text}>
      Danach kannst du Events in deiner Stadt entdecken, neue Leute treffen und
      eigene Events erstellen.
    </Text>
    <Text style={styles.hint}>
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
    </Text>
    <Text style={styles.linkFallback}>{confirmationUrl}</Text>
  </EvendleLayout>
)

export const subject = 'Willkommen bei EVENDLE — bestätige deine E-Mail'
