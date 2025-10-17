// A version of your file with added debugging logs

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    filename?: string; // Added filename for easier File creation
    error?: string;
}

// NOTE: The loadPdfJs function remains the same as yours.
let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;
    isLoading = true;
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        pdfjsLib = lib;
        isLoading = false;
        return lib;
    });
    return loadPromise;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        console.log("DEBUG: Starting PDF conversion...");
        const lib = await loadPdfJs();
        console.log("DEBUG: pdf.js library loaded.");

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        console.log("DEBUG: PDF document loaded. Pages:", pdf.numPages);

        const page = await pdf.getPage(1);
        console.log("DEBUG: Got page 1.");

        const viewport = page.getViewport({ scale: 2 }); // Reduced scale from 4 to 2 to prevent memory issues
        console.log(`DEBUG: Viewport created. Dimensions: ${viewport.width}x${viewport.height}`);

        // Check for excessively large canvases which can cause failure
        if (viewport.width * viewport.height > 16000000) { // e.g., > 4000x4000px
            console.warn("DEBUG: Warning! The canvas size is very large. This can cause image conversion to fail in some browsers.");
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        console.log("DEBUG: Canvas created, starting render...");
        await page.render({ canvasContext: context!, viewport }).promise;
        console.log("DEBUG: Page rendered to canvas.");

        return new Promise((resolve) => {
            console.log("DEBUG: Attempting to create blob from canvas...");
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log("DEBUG: Blob created successfully. Size:", blob.size);
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, { type: "image/png" });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                            filename: `${originalName}.png`, // Pass filename along
                        });
                    } else {
                        // THIS IS A LIKELY FAILURE POINT
                        console.error("DEBUG: FATAL - canvas.toBlob() callback received a null blob.");
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob. The PDF may be too large or corrupted.",
                        });
                    }
                },
                "image/png",
                1.0
            );
        });
    } catch (err) {
        // THIS IS THE OTHER LIKELY FAILURE POINT
        console.error("DEBUG: FATAL - An error was caught during the PDF processing.", err);
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}