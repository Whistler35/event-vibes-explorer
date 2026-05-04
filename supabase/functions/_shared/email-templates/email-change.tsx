/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  confirmationUrl: string
  email?: string
  newEmail?: string
}

export const EmailChangeEmail = ({ confirmationUrl, email, newEmail }: Props) => (
  <EvendleLayout preview="Bestätige deine neue E-Mail-Adresse für EVENDLE">
    <Text style={styles.h1}>Neue E-Mail-Adresse bestätigen</Text>
    <Text style={styles.text}>
      Du hast angefragt, deine E-Mail-Adresse zu ändern{email ? ` von ${email}` : ''}
      {newEmail ? ` zu ${newEmail}` : ''}.
    </Text>
    <Text style={styles.text}>
      Bitte bestätige die Änderung über den Button unten.
    </Text>
    <Section style={styles.buttonWrap}>
      <Button href={confirmationUrl} style={styles.button}>
        E-Mail-Adresse bestätigen
      </Button>
    </Section>
    <Text style={styles.hint}>
      Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.
    </Text>
    <Text style={styles.linkFallback}>{confirmationUrl}</Text>
  </EvendleLayout>
)

export const subject = 'Bestätige deine neue E-Mail-Adresse'
