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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine neue E-Mail-Adresse für EVENDLE</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>E-Mail-Änderung bestätigen</Heading>
            <Text style={styles.text}>
              Du hast angefragt, deine E-Mail-Adresse bei EVENDLE von{' '}
              <Link href={`mailto:${oldEmail}`} style={styles.link}>
                {oldEmail}
              </Link>{' '}
              auf{' '}
              <Link href={`mailto:${newEmail}`} style={styles.link}>
                {newEmail}
              </Link>{' '}
              zu ändern.
            </Text>
            <Button style={styles.button} href={confirmationUrl}>
              Änderung bestätigen
            </Button>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Falls du diese Änderung nicht angefordert hast, sichere bitte
              umgehend dein Konto.
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

export default EmailChangeEmail
