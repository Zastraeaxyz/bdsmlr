export function postTypeName(type?: number): string {
  switch (type) {
    case 0:
      return "General";
    case 1:
      return "Text";
    case 2:
      return "Image";
    case 3:
      return "Video";
    case 4:
      return "Audio";
    case 5:
      return "Link";
    case 6:
      return "Poll";
    case 7:
      return "Quote";
    default:
      return "Post";
  }
}
