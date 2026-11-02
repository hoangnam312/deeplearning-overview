# deeplearning-overview

Ứng dụng Next.js App Router + TypeScript + Tailwind CSS, chuyển từ bản HTML Deep Learning Roadmap. Nội dung học nằm trong JSON và Mermaid, giao diện là template dùng lại.

## Chạy dự án

Yêu cầu Node.js **22.12+** (đã kiểm tra với Node 24) và npm.

```bash
npm ci
npm run dev
```

Mở http://localhost:3000. Bản production:

```bash
npm run build
npm start
```

`npm run build` tự chạy kiểm tra nội dung trước khi build. Các trang nội dung được prerender; sau khi sửa JSON hoặc `.mmd`, build lại để cập nhật production. Khi sửa dữ liệu trong development, tải lại trang; nếu server đang dùng nội dung cũ, khởi động lại `npm run dev`.

## Các trang

| Route | Nội dung |
| --- | --- |
| `/` | Sơ đồ tổng quan, 4 node có liên kết bài viết |
| `/blog` | Danh sách 4 bài |
| `/blog/[slug]` | Tiêu đề và sơ đồ của một bài |
| `/playground` | Dán/sửa Mermaid, xem kết quả sau 400 ms |

Hover hoặc focus liên kết để xem nhanh; click mở sidebar, icon mở trang chuyển tới URL bài độc lập. Ctrl/Cmd-click hoặc chuột giữa mở tab theo hành vi trình duyệt. Escape đóng lớp đang xem và trả focus. Trên điện thoại, chạm mở panel toàn màn hình. Sidebar desktop kéo được cạnh trái hoặc dùng phím trái/phải khi focus thanh resize.

Trong sơ đồ: lăn chuột để zoom quanh con trỏ, kéo để pan, pinch bằng hai ngón trên thiết bị cảm ứng. Các icon lần lượt là thu nhỏ, phóng to, vừa khung, đặt lại về tỉ lệ 100%. Mỗi vùng xem có zoom riêng. Đổi sơ đồ hoặc resize vùng xem sẽ tự vừa khung.

Playground chỉ giữ code trong bộ nhớ của trang; tải lại sẽ trở về sơ đồ ban đầu. Không gửi code tới server để render hoặc ghi file.

## Chỉnh sửa và thêm nội dung

```text
content/
  catalog.json          # Tiêu đề site, thứ tự bài, danh mục sơ đồ, node → slug
  posts/*.json          # Metadata và liên kết của từng bài
  diagrams/*.mmd        # Code Mermaid thuần
```

Mỗi bài có định dạng:

```json
{
  "slug": "ten-bai-viet",
  "title": "Tên bài viết",
  "diagramId": "ten-so-do",
  "relatedSlugs": ["slug-bai-khac"]
}
```

`relatedSlugs` là danh sách điều hướng tới các bài khác, được biểu diễn bằng icon có tooltip tên bài. Có thể để `[]`. Trong bản chuyển đổi, mỗi bài trỏ tới 3 bài còn lại.

Thêm bài mà không sửa template:

1. Thêm file `content/diagrams/ten-so-do.mmd` với code Mermaid.
2. Khai báo sơ đồ trong mảng `diagrams` của `catalog.json`:

   ```json
   { "id": "ten-so-do", "file": "ten-so-do.mmd", "nodeLinks": {} }
   ```

3. Thêm JSON bài vào `content/posts/`, rồi thêm slug vào `postOrder` của catalog.
4. Gắn liên kết từ bài khác qua `relatedSlugs`, hoặc từ node Mermaid qua `nodeLinks` của sơ đồ tương ứng:

   ```json
   { "A": "ten-bai-viet" }
   ```

   Với `flowchart TD` có node `A[...]`, hover/focus/click node A sẽ dùng cùng cơ chế với liên kết bài viết. Dùng node ID rõ ràng trong Mermaid. Liên kết node hiện hỗ trợ **flowchart**; các loại Mermaid khác vẫn render và zoom/pan bình thường.

5. Chạy `npm run check:content`, kiểm tra giao diện, rồi build lại.

Slug và diagram ID dùng chữ thường không dấu, số và dấu gạch ngang. Tên file sơ đồ là basename `.mmd`, không chứa đường dẫn. Loader từ chối metadata sai cấu trúc, slug/ID trùng, thứ tự thiếu/trùng, sơ đồ thiếu/rỗng, node không tồn tại hoặc liên kết đích không tồn tại.

## Component và API nội bộ

- `MermaidViewer({ source, nodeLinks?, onOpenPost?, compact?, label? })`: renderer Mermaid dùng chung; `source` là code thuần, `nodeLinks` là ánh xạ node ID tới slug. Nằm trong `PostProvider` để dùng tương tác bài viết. `onOpenPost` có thể thay hành vi click mặc định.
- `PostContent({ post, compact?, showRelated? })`: template tiêu đề + sơ đồ dùng ở trang bài, popover và sidebar.
- `PostLink({ slug, children, ...anchorProps })`: anchor chuẩn có preview và sidebar, giữ modified click.
- `PostPreview`, `PostSidebar`, `IconButton`: lớp xem nhanh, panel và button icon dùng chung.
- `lib/content.ts`: đọc và kiểm tra dữ liệu trên server; client chỉ nhận dữ liệu đã resolve, không truy cập filesystem.

Mermaid chỉ tải trên client, dùng `securityLevel: strict` và `htmlLabels: false`. Callback `click ... call ...` từ HTML cũ được loại bỏ; liên kết được ứng dụng gắn từ dữ liệu. Code do người dùng nhập không được thực thi như JavaScript. Mỗi render có ID riêng và bỏ qua kết quả đã cũ. Không cần CDN, DB, CMS hoặc API ghi dữ liệu.

## Kiểm thử

```bash
npm run check:content
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

E2E dùng Chrome đã cài trên máy (`channel: chrome`), chạy bản production ở `127.0.0.1:3100`, kiểm tra desktop và mobile giả lập. Nếu máy chưa có Chrome, cài Chrome hoặc chạy `npx playwright install chrome`. Build trước khi chạy E2E.

So sánh sơ đồ với HTML nguồn (tùy chọn):

```bash
SOURCE_HTML=/duong/dan/toi/index.html npm run test:migration
```

Kiểm thử này đối chiếu 5 sơ đồ, chỉ bỏ callback click cũ ở sơ đồ tổng quan. Không sửa file nguồn. Bản chuyển đổi chỉ có 4 chủ đề D, J2, J3, J4; không nhập 25 mô tả chủ đề còn lại.
