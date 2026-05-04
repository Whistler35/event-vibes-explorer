/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import { EvendleLayout, styles } from './_layout.tsx'

interface Props {
  token: string
}

export const ReauthenticationEmail = ({ token }: Props) => (
  <EvendleLayout preview="Dein EVENDLE Bestätigungs-Code">
    <Text style={styles.h1}>Bestätigungs-Code</Text>
    <Text style={styles.text}>
      Bitte gib diesen Code in der App ein, um deine Identität zu bestätigen:
    </Text>
    <Section style={styles.codeBox}>
      <Text style={styles.code}>{token}</Text>
    </Section>
    <Text style={styles.hint}>
      Dieser Code ist nur kurze Zeit gültig. Falls du das nicht angefordert
      hast, ignoriere diese E-Mail.
    </Text>
  </EvendleLayout>
)

export const subject = 'Dein EVENDLE Bestätigungs-Code'
