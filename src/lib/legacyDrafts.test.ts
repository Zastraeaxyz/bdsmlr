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

// Trimmed from the real /editdraft response for a text draft.
const editorHtml = `
<div style="text-align:left;" class="image_content">
  <div contenteditable="true" id="titleedit" class="titletext">
    test draft
  </div>
  <div style="background: #f1f1f1;padding: 10px;text-align:left;">
    <form action="newcommentsubmit" class="newcommentsubmit" id="commentreblog" method="POST">
      <textarea style="" id="editthis" class="textcontent comment" name="content">&lt;p&gt;test draft from Better BDSMLR&lt;/p&gt;</textarea>
    </form>
  </div>
</div>
<div class="type" data-type="text" style="display:none;"></div>
<div data-postid="15613284" data-comment="" class="thisedit" style="color:#000!important;" id="editdiv"></div>
<ul id="Tags"><i class="fa fa-tags"></i><li>test</li><li>second</li></ul>
<div class="buttonsreblog">
  <div class="reblogbholder">
    <div tabindex="1" id="15613284" class="reblogpost" style="background:transparent"></div>
  </div>
</div>
<div class="blogID" style="display:none;" data-blog="123456"></div>`;

// Trimmed from the real /editdraft response for an image draft. These have no
// .thisedit element and put id before class on .reblogpost.
const imageDraftEditorHtml = `
<div class="reblogimage">
  <div class="reblogimage">
    <img src="https://ocdn012.bdsmlr.com/uploads/photos/2026/11/x.png"/>
  </div>
</div>
<div class="type" data-type="image" style="display:none;"></div>
<div style="background: #f1f1f1;padding: 10px;text-align:left;">
  <form action="newcommentsubmit" class="newcommentsubmit" id="commentreblog" method="POST">
    <textarea style="" id="editthis" class="textcontent comment" name="content">&lt;p&gt;Hello draft my old friend&lt;/p&gt;</textarea>
  </form>
</div>
<ul id="Tags"><i class="fa fa-tags" aria-hidden="true"></i><li></li></ul>
<div class="buttonsreblog">
  <div class="reblogbholder">
    <div tabindex="1" id="15613592" class="reblogpost" style="background:transparent"></div>
  </div>
</div>
<div class="blogID" style="display:none;" data-blog="10864856"></div>`;

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

  it("parses an image draft without a thisedit marker", () => {
    expect(parseEditablePost(imageDraftEditorHtml)).toMatchObject({
      id: "15613592",
      postId: "15613592",
      comment: "",
      blogId: "10864856",
      type: "image",
      title: "",
      body: "<p>Hello draft my old friend</p>",
      tags: [],
      earlier: "1",
    });
  });

  it("falls back to the requested draft id", () => {
    const htmlWithoutMarkers =
      '<div class="type" data-type="text"></div>' +
      '<textarea id="editthis">body</textarea>';
    expect(parseEditablePost(htmlWithoutMarkers, "15613302")).toMatchObject({
      id: "15613302",
      postId: "15613302",
      type: "text",
      body: "body",
    });
  });
});
