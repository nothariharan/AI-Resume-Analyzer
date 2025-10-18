import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from  "react-router";// Use react-router-dom
import {usePuterStore} from "~/lib/puter";
import ATS from "~/components/ATS";
import Summary from "~/components/Summary";
import Details from "~/components/Details";

export const meta = () => ([
    {title:'Resumlyzer | Review'},
    {name: 'description', content: 'Detailed overview of your resume'}
]);

const Resume = () => {
    const { auth, isLoading, fs, kv} = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate()
    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume${id}`)
    }, [isLoading]);

    // This log is crucial for debugging. It shows the actual state on each render.
    console.log("Component rendered with imageUrl:", imageUrl);

    useEffect(() => {
        if (!fs || !kv || !id) return; // Guard against uninitialized stores or ID

        const loadResume = async () => {
            const resumeJSON = await kv.get(`resume:${id}`);
            if (!resumeJSON) {
                console.error("No resume data found for this ID.");
                return;
            }

            const data = JSON.parse(resumeJSON);

            // Correctly handle image blob
            const imageBlobData = await fs.read(data.imagePath);
            if (imageBlobData) {
                const imageBlob = new Blob([imageBlobData], { type: 'image/png' }); // Assuming PNG
                const url = URL.createObjectURL(imageBlob);
                setImageUrl(url); // This will trigger a re-render
            }

            // Correctly handle PDF blob
            const resumeBlobData = await fs.read(data.resumePath);
            if (resumeBlobData) {
                const pdfBlob = new Blob([resumeBlobData], { type: 'application/pdf' });
                setResumeUrl(URL.createObjectURL(pdfBlob));
            }

            setFeedback(data.feedback);
        };

        loadResume();

        // Cleanup function to revoke object URLs and prevent memory leaks
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
            if (resumeUrl) URL.revokeObjectURL(resumeUrl);
        };
    }, [id, fs, kv]); // Add dependencies

    return (
        // ✅ FIX: Added flexbox and min-height to ensure the parent has dimensions
        <main className="!pt-0 flex flex-col min-h-screen">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="Back" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back To Homepage</span>
                </Link>
            </nav>
            {/* The main content area */}
            <div className="flex flex-row flex-grow w-full max-lg:flex-col-reverse">
                <section className="feedback-section bf-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {/* Check if imageUrl has a value before rendering */}
                    {imageUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] w-auto p-4">
                            <img
                                src={imageUrl}
                                className="w-full h-full object-contain rounded-2xl"
                                alt="Resume preview"
                            />
                        </div>
                    ) : (
                        <div className="text-white">Loading Image...</div> // Show a loading state
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback? (
                        <div className="flex flex-col gap-8  animate-in fade-in duration-1000">
                            <Summary feedback = {feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestion={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ):(
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    );
};

export default Resume;