import Link from "next/link";

const Home = () => {
    return (
        <main className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light">
            <h1 className="display-4 mb-5 text-dark fw-bold">AI Toolbox</h1>

            <div className="d-flex flex-wrap justify-content-evenly gap-4">
                <Link
                    href="/chat"
                    className="btn btn-primary btn-lg px-4 py-3 fw-bold shadow"
                >
                    AI Chatbot
                </Link>

                <Link
                    href="/image-processing"
                    className="btn btn-success btn-lg px-4 py-3 fw-bold shadow"
                >
                    Image Processing
                </Link>

                <Link
                    href="/language-learning"
                    className="btn btn-warning btn-lg px-4 py-3 fw-bold text-white shadow"
                >
                    AI Language Learning
                </Link>

                <Link
                    href="/text-recognition"
                    className="btn btn-info btn-lg px-4 py-3 fw-bold text-white shadow"
                >
                    Text Recognition
                </Link>
            </div>
        </main>
    );
};

export default Home;
