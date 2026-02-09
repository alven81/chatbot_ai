import Link from "next/link";

const Home = () => {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "2rem",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>AI Toolbox</h1>

      <div style={{ display: "flex", gap: "1.5rem" }}>
        <Link
          href="/chat"
          style={{
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            backgroundColor: "#0070f3",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          AI Chatbot
        </Link>

        <Link
          href="/image-processing"
          style={{
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            backgroundColor: "#28a745",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          Image Processing
        </Link>

        <Link
          href="/language-learning"
          style={{
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            backgroundColor: "#e67e22",
            color: "white",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          AI Language Learning
        </Link>
      </div>
    </main>
  );
};

export default Home;
