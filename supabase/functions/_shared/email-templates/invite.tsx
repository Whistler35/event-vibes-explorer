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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Du wurdest zu EVENDLE eingeladen</Preview>
    <Body style={styles.main}>
      <Section style={styles.outer}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>EVENDLE</Text>
          </Section>
          <Section style={styles.accentBar}>&nbsp;</Section>
          <Section style={styles.body}>
            <Heading style={styles.h1}>Du bist eingeladen 🎉</Heading>
            <Text style={styles.text}>
              Du wurdest eingeladen, EVENDLE beizutreten. Klicke auf den Button,
              um die Einladung anzunehmen und dein Konto zu erstellen.
            </Text>
            <Button style={styles.button} href={confirmationUrl}>
              Einladung annehmen
            </Button>
            <Section style={styles.divider}>&nbsp;</Section>
            <Text style={styles.text}>
              Falls du keine Einladung erwartet hast, kannst du diese E-Mail
              ignorieren.
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

export default InviteEmail
