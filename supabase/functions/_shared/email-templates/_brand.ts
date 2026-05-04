// EVENDLE brand styles for auth emails
export const brand = {
  forest: '#173518',
  citrus: '#f4f4bb',
  lime: '#d8d87a',
  white: '#ffffff',
  bg: '#f6f6f6',
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    margin: '0',
    padding: '0',
  },
  outer: {
    backgroundColor: '#f6f6f6',
    padding: '24px 12px',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    overflow: 'hidden' as const,
    border: '1px solid #ececec',
  },
  header: {
    backgroundColor: '#173518',
    padding: '28px 32px 24px',
    textAlign: 'left' as const,
  },
  wordmark: {
    color: '#f4f4bb',
    fontSize: '26px',
    fontWeight: 800 as const,
    letterSpacing: '2px',
    margin: '0',
    lineHeight: '1',
  },
  accentBar: {
    height: '4px',
    backgroundColor: '#d8d87a',
    fontSize: '0',
    lineHeight: '0',
  },
  body: {
    padding: '32px 32px 24px',
  },
  h1: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: '#173518',
    margin: '0 0 16px',
    lineHeight: '1.3',
  },
  text: {
    fontSize: '15px',
    color: '#3a3a3a',
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  link: {
    color: '#173518',
    textDecoration: 'underline',
    fontWeight: 600 as const,
  },
  button: {
    backgroundColor: '#173518',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: '10px',
    padding: '14px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '28px',
    fontWeight: 700 as const,
    color: '#173518',
    backgroundColor: '#f4f4bb',
    padding: '14px 20px',
    borderRadius: '10px',
    letterSpacing: '4px',
    display: 'inline-block',
    margin: '0 0 24px',
  },
  divider: {
    borderTop: '1px solid #ececec',
    margin: '28px 0 20px',
  },
  footer: {
    fontSize: '12px',
    color: '#888888',
    lineHeight: '1.5',
    margin: '0',
    padding: '0 32px 28px',
    textAlign: 'center' as const,
  },
}
