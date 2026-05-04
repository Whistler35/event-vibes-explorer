/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { styles } from './_brand.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode für EVENDLE</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>Identität bestätigen</Heading>
            <Text style={styles.text}>
              Verwende den folgenden Code, um deine Identität zu bestätigen:
            </Text>
            <Text style={styles.code}>{token}</Text>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Dieser Code läuft in Kürze ab. Falls du dies nicht angefordert
              hast, kannst du diese E-Mail ignorieren.
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

export default ReauthenticationEmail
