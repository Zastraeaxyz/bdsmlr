import { describe, expect, it } from "vitest";
import {
  hasTurnstile,
  parseAccountUserLogin,
  parseInvitationFeedback,
  parseInvitationsPage,
  parseLoginError,
  parseNotificationsPage,
  parseProfileUserLogin,
  parseSendInvitePage,
} from "./invitationsParse";

const invitationsHtml = `
<div id="message" class="bp-template-notice updated"><p>Invitation successfully sent!</p></div>
<form action="" method="post" id="invitations-bulk-management">
  <table class="invitations">
    <thead>
      <tr><th>Invitee</th><th>Message</th><th>Sent</th><th>Accepted</th><th>Date Modified</th><th>Actions</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="bulk-select-check"><input id="42" type="checkbox" name="members_invitations[]" value="42"></td>
        <td class="invitation-invitee">friend@example.com</td>
        <td class="invitation-content">Join us</td>
        <td class="invitation-sent">1</td>
        <td class="invitation-accepted">0</td>
        <td class="invitation-date-modified">2026-11-19 12:00:00</td>
        <td class="invitation-actions">
          <a href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/?action=resend&amp;invitation_id=42&amp;_wpnonce=resend42">Resend</a> |
          <a href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/?action=cancel&amp;invitation_id=42&amp;_wpnonce=cancel42">Cancel</a>
        </td>
      </tr>
      <tr>
        <td class="bulk-select-check"><input id="41" type="checkbox" name="members_invitations[]" value="41"></td>
        <td class="invitation-invitee">accepted@example.com</td>
        <td class="invitation-content"></td>
        <td class="invitation-sent">1</td>
        <td class="invitation-accepted">1</td>
        <td class="invitation-date-modified">2026-11-18 09:30:00</td>
        <td class="invitation-actions">
          <a href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/?action=cancel&amp;invitation_id=41&amp;_wpnonce=cancel41">Delete</a>
        </td>
      </tr>
    </tbody>
  </table>
  <input type="hidden" name="invitations_bulk_nonce" value="bulk123">
</form>
<div class="pag-count" id="invitations-count-top">Viewing 1 - 2 of 2 invitations</div>
<a class="next page-numbers" href="?ipage=2">2</a>
`;

const sendHtml = `
<form class="standard-form network-invitation-form" id="network-invitation-form" method="post">
  <label for="bp_members_invitation_invitee_email">Email</label>
  <input id="bp_members_invitation_invitee_email" type="email" name="invitee_email" required="required">
  <label for="bp_members_invitation_message">Message</label>
  <textarea id="bp_members_invitation_message" name="content"></textarea>
  <input type="hidden" name="action" value="send-invite">
  <input type="hidden" id="_wpnonce" name="_wpnonce" value="sendnonce">
  <input type="hidden" name="_wp_http_referer" value="/members/zastraeachastity/invitations/send-invites/">
  <div class="submit"><input type="submit" name="member-send-invite-submit" id="submit" value="Send"></div>
</form>
`;

const notificationsHtml = `
<table class="notifications bp-tables-user">
  <tbody>
    <tr>
      <td></td>
      <td class="bulk-select-check"><input id="7" type="checkbox" name="notifications[]" value="7"></td>
      <td class="notification-description">
        <a href="https://account.bdsmlr.com/members/newfriend/?welcome=1">New Friend</a> accepted your membership invitation
      </td>
      <td class="notification-since"><span title="2026-11-19 10:00:00">2 hours ago</span></td>
      <td class="notification-actions"></td>
    </tr>
    <tr>
      <td></td>
      <td class="bulk-select-check"><input id="8" type="checkbox" name="notifications[]" value="8"></td>
      <td class="notification-description">
        <a href="https://account.bdsmlr.com/members/other/">Other</a> sent you a message
      </td>
      <td class="notification-since">1 day ago</td>
      <td class="notification-actions"></td>
    </tr>
  </tbody>
</table>
<a class="next page-numbers" href="?npage=2">2</a>
`;

describe("parseInvitationsPage", () => {
  it("parses pending and accepted rows with their action links", () => {
    const page = parseInvitationsPage(invitationsHtml);
    expect(page.total).toBe(2);
    expect(page.nextPage).toBe(2);
    expect(page.bulkNonce).toBe("bulk123");
    expect(page.feedback).toMatchObject({
      type: "success",
      message: "Invitation successfully sent!",
    });
    expect(page.invitations).toHaveLength(2);
    expect(page.invitations[0]).toMatchObject({
      id: "42",
      email: "friend@example.com",
      message: "Join us",
      sent: true,
      accepted: false,
      dateModified: "2026-11-19 12:00:00",
    });
    expect(page.invitations[0].resendUrl).toContain("action=resend");
    expect(page.invitations[0].resendUrl).toContain("_wpnonce=resend42");
    expect(page.invitations[0].cancelUrl).toContain("action=cancel");
    expect(page.invitations[1]).toMatchObject({
      id: "41",
      email: "accepted@example.com",
      accepted: true,
    });
    expect(page.invitations[1].resendUrl).toBeUndefined();
    expect(page.invitations[1].cancelUrl).toContain("action=cancel");
  });

  it("understands Yes, No, Sent, and Not sent text", () => {
    const page = parseInvitationsPage(`
      <table class="invitations"><tbody>
        <tr>
          <td><input type="checkbox" name="members_invitations[]" value="5"></td>
          <td class="invitation-invitee">a@example.com</td>
          <td class="invitation-sent">Not sent</td>
          <td class="invitation-accepted">No</td>
        </tr>
        <tr>
          <td><input type="checkbox" name="members_invitations[]" value="6"></td>
          <td class="invitation-invitee">b@example.com</td>
          <td class="invitation-sent">Sent</td>
          <td class="invitation-accepted">Accepted</td>
        </tr>
      </tbody></table>`);
    expect(page.invitations[0]).toMatchObject({
      sent: false,
      accepted: false,
    });
    expect(page.invitations[1]).toMatchObject({
      sent: true,
      accepted: true,
    });
  });
});

describe("parseSendInvitePage", () => {
  it("parses the form nonce and hidden fields", () => {
    const page = parseSendInvitePage(sendHtml);
    expect(page.allowed).toBe(true);
    expect(page.nonce).toBe("sendnonce");
    expect(page.fields.action).toBe("send-invite");
    expect(page.fields._wp_http_referer).toBe(
      "/members/zastraeachastity/invitations/send-invites/",
    );
  });

  it("reports when sending is not allowed", () => {
    const page = parseSendInvitePage(
      `<aside class="bp-feedback bp-messages error"><p>You are not allowed to send invitations.</p></aside>`,
    );
    expect(page.allowed).toBe(false);
    expect(page.nonce).toBe("");
    expect(page.feedback).toMatchObject({
      type: "error",
      message: "You are not allowed to send invitations.",
    });
  });
});

describe("parseNotificationsPage", () => {
  it("keeps accepted invitations and ignores other notifications", () => {
    const page = parseNotificationsPage(notificationsHtml);
    expect(page.nextPage).toBe(2);
    expect(page.accepted).toHaveLength(1);
    expect(page.accepted[0]).toMatchObject({
      id: "7",
      displayName: "New Friend",
      userLogin: "newfriend",
      accountProfileUrl: "https://account.bdsmlr.com/members/newfriend/",
      timeSince: "2 hours ago",
      dateTitle: "2026-11-19 10:00:00",
    });
  });

  it("ignores welcome links on other hosts", () => {
    const page = parseNotificationsPage(`
      <table class="notifications"><tbody>
        <tr>
          <td class="notification-description"><a href="https://example.com/members/evil/?welcome=1">Evil</a></td>
          <td class="notification-since">now</td>
        </tr>
      </tbody></table>`);
    expect(page.accepted).toHaveLength(0);
  });
});

describe("parseInvitationFeedback", () => {
  it("ignores informational help feedback", () => {
    expect(
      parseInvitationFeedback(
        `<aside class="bp-feedback bp-messages info"><p>Enter an email address.</p></aside>`,
      ),
    ).toBeNull();
  });

  it("reads error feedback", () => {
    expect(
      parseInvitationFeedback(
        `<div id="message" class="bp-template-notice error"><p>There was a problem.</p></div>`,
      ),
    ).toMatchObject({ type: "error", message: "There was a problem." });
  });
});

describe("account page helpers", () => {
  it("reads the username from the canonical link", () => {
    expect(
      parseAccountUserLogin(
        `<link rel="canonical" href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/" />`,
      ),
    ).toBe("zastraeachastity");
  });

  it("reads the username from the admin bar", () => {
    expect(
      parseAccountUserLogin(
        `<li id="wp-admin-bar-my-account"><a href="https://account.bdsmlr.com/members/zastraeachastity/">Howdy</a></li>`,
      ),
    ).toBe("zastraeachastity");
  });

  it("reads the username from the WordPress profile page", () => {
    expect(
      parseProfileUserLogin(
        `<input type="text" name="user_login" id="user_login" value="zastraeachastity" class="regular-text" />`,
      ),
    ).toBe("zastraeachastity");
  });

  it("detects Turnstile and login errors", () => {
    expect(hasTurnstile(`<div class="cf-turnstile"></div>`)).toBe(true);
    expect(hasTurnstile(`<form id="loginform"></form>`)).toBe(false);
    expect(
      parseLoginError(
        `<div id="login_error"><p><strong>Error:</strong> Incorrect password.</p></div>`,
      ),
    ).toBe("Error: Incorrect password.");
  });
});
