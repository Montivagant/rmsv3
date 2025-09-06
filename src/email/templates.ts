export interface WelcomeEmailParams {
  name: string;
  accountId: string;
  email: string;
}

export interface EmailPayload {
  subject: string;
  text: string;
  html: string;
}

export function welcomeEmail({ name, accountId, email }: WelcomeEmailParams): EmailPayload {
  const subject = 'Welcome to DashUp — Your account details';

  const text = [
    `Hello ${name},`,
    ``,
    `Welcome to DashUp!`,
    ``,
    `Your account has been created successfully.`,
    ``,
    `Account ID: ${accountId}`,
    `Login Email: ${email}`,
    ``,
    `Next steps: Open the app and log in with these credentials.`,
    ``,
    `If you need help, contact our support team at support@example.com`,
    ``,
    `— DashUp Team`,
  ].join('\n');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `  <title>${subject}</title>`,
    '</head>',
    '<body>',
    '  <div role="article" aria-roledescription="email" aria-label="Welcome to DashUp" style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, \'Helvetica Neue\', Arial, sans-serif; line-height: 1.5; color: #111827;">',
    '    <div style="max-width: 600px; margin: 0 auto; padding: 24px;">',
    '      <div style="text-align: center; margin-bottom: 16px;">',
    '        <img src="cid:dashup-logo" alt="DashUp" width="64" height="64" style="display: inline-block;" />',
    '      </div>',
    '      <h1 style="font-size: 20px; margin: 0 0 12px;">Welcome to DashUp</h1>',
    `      <p style="margin: 0 0 12px;">Hello ${escapeHtml(name)},</p>`,
    '      <p style="margin: 0 0 16px;">Your account has been created successfully.</p>',
    '      <div style="margin: 16px 0; padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px;">',
    '        <p style="margin: 0 0 8px;"><strong>Account ID:</strong> ' + escapeHtml(accountId) + '</p>',
    '        <p style="margin: 0;"><strong>Login Email:</strong> ' + escapeHtml(email) + '</p>',
    '      </div>',
    '      <p style="margin: 0 0 16px;">Next steps: Open the app and log in with these credentials.</p>',
    '      <p style="margin: 0 0 16px; color: #374151;">',
    '        If you need help, contact our support team at support@example.com',
    '      </p>',
    '      <p style="margin: 24px 0 0;">— DashUp Team</p>',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>',
  ].join('\n');

  return { subject, text, html };
}

// Basic HTML escape
function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#39;');
}
