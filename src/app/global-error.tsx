"use client";

// Last-resort boundary: replaces the root layout, so it cannot rely on the app's styles or providers.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-NG">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f4fbf6",
          color: "#161d1a",
        }}
      >
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>OgaSabi is having trouble</h1>
          <p style={{ marginBottom: 20 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 8,
              border: 0,
              background: "#032515",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
