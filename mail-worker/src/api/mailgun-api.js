import app from '../hono/hono';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import { isDel, emailConst } from '../const/entity-const';

app.post('/mailgun-webhook', async (c) => {
    const body = await c.req.parseBody();
    console.log('Mailgun body keys:', JSON.stringify(Object.keys(body)));

    const sender    = body['sender'] || '';
    const from      = body['from'] || sender;
    const recipient = body['recipient'] || '';
    const subject   = body['subject'] || '(no subject)';
    const bodyHtml  = body['body-html'] || body['stripped-html'] || '';
    const bodyPlain = body['body-plain'] || body['stripped-text'] || '';

    console.log('Mailgun inbound:', { sender: from, recipient, subject });

    const html = bodyHtml || (bodyPlain ? '<pre>' + bodyPlain.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</pre>' : '');

    if (!recipient) {
        return c.json({ error: 'Missing recipient' }, 400);
    }

    let fromName = '', fromEmail = sender;
    const m = from.match(/^"?([^"]*)"?\s*<?([^>]*)>?$/);
    if (m) { fromName = m[1].trim(); fromEmail = m[2].trim() || sender; }

    let messageId = '';
    try {
        const headers = JSON.parse(body['message-headers'] || '[]');
        const h = headers.find(h => Array.isArray(h) && h.length >= 2 && String(h[0]).toLowerCase() === 'message-id');
        if (h) messageId = h[1];
    } catch (_) {}

    const account = await accountService.selectByEmailIncludeDel({ env: c.env }, recipient);
    const userId  = account ? account.userId : 0;
    const accountId = account ? account.accountId : 0;

    const params = {
        toEmail: recipient,
        toName: '',
        sendEmail: fromEmail,
        name: fromName || fromEmail.split('@')[0],
        subject: subject,
        code: '',
        content: html,
        text: bodyPlain,
        cc: '[]',
        bcc: '[]',
        recipient: JSON.stringify([{ address: recipient, name: '' }]),
        inReplyTo: '',
        relation: '',
        messageId: messageId,
        userId: userId,
        accountId: accountId,
        isDel: isDel.DELETE,
        status: emailConst.status.SAVING
    };

    let emailRow = await emailService.receive({ env: c.env }, params, [], '');

    emailRow = await emailService.completeReceive(
        { env: c.env },
        account ? emailConst.status.RECEIVE : emailConst.status.NOONE,
        emailRow.emailId
    );

    return c.json({ success: true });
});
