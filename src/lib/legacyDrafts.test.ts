import { describe, expect, it } from "vitest";
import { parseDrafts, parseEditablePost } from "./legacyDrafts";

const draftsHtml = `
<div class="newsfeed">
  <div class="wrapqueuepost" id="15613284">
    <div class="image_content">
      <div class="titletext">test draft</div>
      <div class="textcontent"><p>test draft from Better BDSMLR</p></div>
    </div>
    <div class="tags"><a class="tag" href="/search/test">#test</a></div>
  </div>
  <div class="wrapqueuepost" id="15613283">
    <div class="image_content">
      <a class="magnify" href="https://cdn012.bdsmlr.com/x.png"><img src="https://cdn012.bdsmlr.com/x.png"></a>
    </div>
    <div class="tags"><a class="tag" href="/search/test">#test</a></div>
  </div>
</div>`;

const editorHtml = `
<div class="image_content">
  <div contenteditable="true" id="titleedit" class="titletext">test draft</div>
  <textarea id="editthis" class="textcontent comment" name="content">&lt;p&gt;test draft from Better BDSMLR&lt;/p&gt;</textarea>
</div>
<div class="type" data-type="text"></div>
<div data-postid="15613284" data-comment="" class="thisedit"></div>
<ul id="Tags"><i class="fa fa-tags"></i><li>test</li><li>second</li></ul>
<div class="blogID" data-blog="123456"></div>
<div class="reblogpost" id="15613284"></div>`;

describe("parseDrafts", () => {
  it("parses text and image drafts", () => {
    const drafts = parseDrafts(draftsHtml);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      id: "15613284",
      title: "test draft",
      text: "test draft from Better BDSMLR",
      tags: ["test"],
      kind: "text",
    });
    expect(drafts[1]).toMatchObject({
      id: "15613283",
      image: "https://cdn012.bdsmlr.com/x.png",
      kind: "image",
    });
  });
});

describe("parseEditablePost", () => {
  it("parses the legacy editor fields", () => {
    expect(parseEditablePost(editorHtml)).toMatchObject({
      id: "15613284",
      postId: "15613284",
      comment: "",
      blogId: "123456",
      type: "text",
      title: "test draft",
      body: "<p>test draft from Better BDSMLR</p>",
      tags: ["test", "second"],
      earlier: "1",
    });
  });
});
