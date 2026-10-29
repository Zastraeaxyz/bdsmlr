import { describe, expect, it } from "vitest";
import { parseQueue } from "./legacyQueue";

const queueHtml = `
<div class="newsfeed">
  <div class="postsinqueue">Posts in Queue: 1</div>
  <input class="switch-input" value="0" checked type="checkbox">
  <select class="starttime"><option selected>0</option><option>1</option></select>
  <select class="endtime"><option>22</option><option selected>23</option></select>
  <select class="publishtime">
    <option value="5">Every 5 minutes</option>
    <option value="1" selected>1 per 24 hours</option>
  </select>
  <select name="timezone"><option value="GMT" selected>GMT</option></select>
  <div class="news panel" id="155081254">
    <div class="post_content">
      <div class="post_info"><a class="ndata">zastraeachastity</a></div>
      <div class="image_content">
        <div class="titletext">opencode queue scratch</div>
        <div class="textcontent"><p>opencode queue scratch</p></div>
      </div>
      <div class="tags"><a class="tag" href="/search/opencode-test">#opencode-test</a></div>
      <div class="calendar"><i class="fa fa-calendar" data-time="2026-10-30 09:00" data-postid="155081254"></i></div>
      <div class="publishpost" data-id="155081254">Publish</div>
      <div class="editpost"><i class="fal fa-edit" data-id="155081254"></i></div>
    </div>
  </div>
</div>`;

describe("parseQueue", () => {
  it("parses queue settings and items", () => {
    const queue = parseQueue(queueHtml);
    expect(queue.count).toBe(1);
    expect(queue.settings).toMatchObject({
      running: true,
      startHour: 0,
      endHour: 23,
      interval: "1",
      timezone: "GMT",
      random: false,
    });
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({
      id: "155081254",
      title: "opencode queue scratch",
      text: "opencode queue scratch",
      tags: ["opencode-test"],
      blogName: "zastraeachastity",
      scheduledAt: "2026-10-30 09:00",
      kind: "text",
    });
  });
});
