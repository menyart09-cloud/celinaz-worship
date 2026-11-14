// Same narrow column as the real /team layout — this is what makes the
// preview actually look like a phone screen even though it's rendered
// inside the admin chrome above it.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-4 w-full max-w-md">{children}</div>;
}
