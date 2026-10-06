import BookmarksClient from './BookmarksClient.jsx';

export const metadata = { title: 'Bookmarks', robots: { index: false, follow: false } };

export default function BookmarksPage() {
  return <BookmarksClient />;
}
