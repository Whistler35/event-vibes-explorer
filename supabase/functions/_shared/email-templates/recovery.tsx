/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { styles } from './_brand.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Passwort zurücksetzen für EVENDLE</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>Passwort zurücksetzen</Heading>
            <Text style={styles.text}>
              Wir haben eine Anfrage erhalten, dein Passwort für EVENDLE
              zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu
              vergeben.
            </Text>
            <Button style={styles.button} href={confirmationUrl}>
              Neues Passwort wählen
            </Button>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Falls du keine Passwort-Zurücksetzung angefordert hast, kannst du
              diese E-Mail ignorieren — dein Passwort bleibt unverändert.
            </Text>
          </Section>
          <Text style={styles.footer}>
            EVENDLE — Entdecke Events in deiner Nähe
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default RecoveryEmail
