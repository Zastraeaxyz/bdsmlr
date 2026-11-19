import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadAccountInvitations,
  runAccountInvitationAction,
  sendAccountInvitation,
} from "./accountSite";

const sendHtml = `
<form class="standard-form network-invitation-form" id="network-invitation-form" method="post">
  <input id="bp_members_invitation_invitee_email" type="email" name="invitee_email" required>
  <textarea id="bp_members_invitation_message" name="content"></textarea>
  <input type="hidden" name="action" value="send-invite">
  <input type="hidden" id="_wpnonce" name="_wpnonce" value="sendnonce">
  <input type="hidden" name="_wp_http_referer" value="/members/zastraeachastity/invitations/send-invites/">
</form>`;

const sendSuccessHtml = `${sendHtml}
<div id="message" class="bp-template-notice updated"><p>Invitation successfully sent!</p></div>`;

const actionSuccessHtml = `
<div id="message" class="bp-template-notice updated"><p>Invitation successfully resent.</p></div>`;

const listHtml = `
<table class="invitations">
  <tbody>
    <tr>
      <td class="bulk-select-check"><input id="42" type="checkbox" name="members_invitations[]" value="42"></td>
      <td class="invitation-invitee">friend@example.com</td>
      <td class="invitation-content">Join us</td>
      <td class="invitation-sent">1</td>
      <td class="invitation-accepted">0</td>
      <td class="invitation-date-modified">2026-11-19 12:00:00</td>
      <td class="invitation-actions">
        <a href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/?action=resend&amp;invitation_id=42&amp;_wpnonce=resend42">Resend</a>
        <a href="https://account.bdsmlr.com/members/zastraeachastity/invitations/list-invites/?action=cancel&amp;invitation_id=42&amp;_wpnonce=cancel42">Cancel</a>
      </td>
    </tr>
  </tbody>
</table>
<input type="hidden" name="invitations_bulk_nonce" value="bulk123">
<div class="pag-count" id="invitations-count-top">Viewing 1 - 1 of 1 invitation</div>`;

const notificationsHtml = `
<table class="notifications">
  <tbody>
    <tr>
      <td><input type="checkbox" name="notifications[]" value="7"></td>
      <td class="notification-description"><a href="https://account.bdsmlr.com/members/newfriend/?welcome=1">New Friend</a> accepted your membership invitation</td>
      <td class="notification-since"><span title="2026-11-19 10:00:00">2 hours ago</span></td>
    </tr>
  </tbody>
</table>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadAccountInvitations", () => {
  it("loads the send form, list, and accepted notifications", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/invitations/send-invites/")) {
          return new Response(sendHtml, { status: 200 });
        }
        if (url.pathname.endsWith("/invitations/list-invites/")) {
          return new Response(listHtml, { status: 200 });
        }
        if (url.pathname.endsWith("/notifications/")) {
          return new Response(notificationsHtml, { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const data = await loadAccountInvitations(
      "wordpress_logged_in_test=abc",
      "zastraeachastity",
    );
    expect(data.allowed).toBe(true);
    expect(data.invitations).toHaveLength(1);
    expect(data.invitations[0]).toMatchObject({
      id: "42",
      email: "friend@example.com",
      accepted: false,
    });
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0]).toMatchObject({
      userLogin: "newfriend",
      displayName: "New Friend",
    });
    expect(data.notificationsError).toBeNull();
  });
});

describe("sendAccountInvitation", () => {
  it("submits the BuddyPress send form with its nonce", async () => {
    const captured = { posted: null as URLSearchParams | null };
    let pageLoads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (init?.method === "POST") {
          captured.posted = new URLSearchParams(String(init.body));
          return new Response(null, {
            status: 302,
            headers: {
              location:
                "/members/zastraeachastity/invitations/send-invites/",
            },
          });
        }
        if (url.pathname.endsWith("/invitations/send-invites/")) {
          pageLoads += 1;
          return new Response(pageLoads > 1 ? sendSuccessHtml : sendHtml, {
            status: 200,
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await sendAccountInvitation(
      "wordpress_logged_in_test=abc",
      "zastraeachastity",
      "friend@example.com",
      "Join us",
    );
    expect(captured.posted?.get("action")).toBe("send-invite");
    expect(captured.posted?.get("_wpnonce")).toBe("sendnonce");
    expect(captured.posted?.get("invitee_email")).toBe("friend@example.com");
    expect(captured.posted?.get("content")).toBe("Join us");
    expect(result).toMatchObject({
      ok: true,
      message: "Invitation successfully sent!",
      type: "success",
    });
  });
});

describe("runAccountInvitationAction", () => {
  it("uses the per-row resend link", async () => {
    let listLoads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.searchParams.get("action") === "resend") {
          return new Response(null, {
            status: 302,
            headers: {
              location:
                "/members/zastraeachastity/invitations/list-invites/",
            },
          });
        }
        if (url.pathname.endsWith("/invitations/list-invites/")) {
          listLoads += 1;
          return new Response(
            listLoads > 1 ? `${listHtml}${actionSuccessHtml}` : listHtml,
            { status: 200 },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await runAccountInvitationAction(
      "wordpress_logged_in_test=abc",
      "zastraeachastity",
      "resend",
      ["42"],
    );
    expect(result).toMatchObject({
      ok: true,
      message: "Invitation successfully resent.",
    });
  });

  it("uses the bulk form for multiple invitations", async () => {
    const captured = { posted: null as URLSearchParams | null };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (init?.method === "POST") {
          captured.posted = new URLSearchParams(String(init.body));
          return new Response(null, {
            status: 302,
            headers: {
              location:
                "/members/zastraeachastity/invitations/list-invites/",
            },
          });
        }
        if (url.pathname.endsWith("/invitations/list-invites/")) {
          return new Response(`${listHtml}${actionSuccessHtml}`, {
            status: 200,
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await runAccountInvitationAction(
      "wordpress_logged_in_test=abc",
      "zastraeachastity",
      "cancel",
      ["42", "41"],
    );
    expect(captured.posted?.get("invitation_bulk_action")).toBe("cancel");
    expect(captured.posted?.getAll("members_invitations[]")).toEqual(["42", "41"]);
    expect(captured.posted?.get("invitations_bulk_nonce")).toBe("bulk123");
    expect(result.ok).toBe(true);
  });
});
