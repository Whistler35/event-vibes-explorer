/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: Props) => (
  <EvendleLayout preview="Setze dein EVENDLE-Passwort zurück">
    <Text style={styles.h1}>Passwort zurücksetzen</Text>
    <Text style={styles.text}>
      Du hast eine Zurücksetzung deines Passworts angefordert. Klicke auf den
      Button unten, um ein neues Passwort festzulegen.
    </Text>
    <Section style={styles.buttonWrap}>
      <Button href={confirmationUrl} style={styles.button}>
        Neues Passwort festlegen
      </Button>
    </Section>
    <Text style={styles.text}>
      Dieser Link ist aus Sicherheitsgründen nur für kurze Zeit gültig.
    </Text>
    <Text style={styles.hint}>
      Falls du das nicht angefordert hast, kannst du diese E-Mail einfach
      ignorieren — dein Passwort bleibt unverändert.
    </Text>
    <Text style={styles.linkFallback}>{confirmationUrl}</Text>
  </EvendleLayout>
)

export const subject = 'Setze dein EVENDLE-Passwort zurück'
