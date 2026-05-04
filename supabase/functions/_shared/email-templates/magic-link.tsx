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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Login-Link für EVENDLE</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>Dein Login-Link</Heading>
            <Text style={styles.text}>
              Klicke auf den Button, um dich bei EVENDLE anzumelden. Der Link
              ist nur kurze Zeit gültig.
            </Text>
            <Button style={styles.button} href={confirmationUrl}>
              Jetzt anmelden
            </Button>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Falls du diesen Link nicht angefordert hast, kannst du diese
              E-Mail ignorieren.
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

export default MagicLinkEmail
