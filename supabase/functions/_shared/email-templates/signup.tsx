/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { styles } from './_brand.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine E-Mail für EVENDLE</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>Willkommen bei EVENDLE! 🎉</Heading>
            <Text style={styles.text}>
              Schön, dass du dabei bist. Bitte bestätige deine E-Mail-Adresse (
              <Link href={`mailto:${recipient}`} style={styles.link}>
                {recipient}
              </Link>
              ), um loszulegen.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button style={styles.button} href={confirmationUrl}>
                E-Mail bestätigen
              </Button>
            </Section>
            <Text style={{ ...styles.text, fontSize: '13px', color: '#6b7280' }}>
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              <br />
              <Link href={confirmationUrl} style={{ ...styles.link, wordBreak: 'break-all' }}>
                {confirmationUrl}
              </Link>
            </Text>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Falls du dich nicht bei EVENDLE registriert hast, kannst du diese
              E-Mail einfach ignorieren.
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

export default SignupEmail
