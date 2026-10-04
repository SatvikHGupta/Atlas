import BookmarksClient from './BookmarksClient.jsx';

export const metadata = { title: 'Bookmarks - Atlas', robots: { index: false, follow: false } };

export default function BookmarksPage() {
  return <BookmarksClient />;
}
