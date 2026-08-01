import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import Header from "../components/shared/header";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../lib/authServices";

export default function HomePage({
  onNavigate,
  isLoggedIn,
  onLogout,
  username,
}) {
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState([]); // [{ file, url }]
  const [selectedMethods, setSelectedMethods] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const addFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, 40 - uploadedImages.length);
    const newEntries = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setUploadedImages([...uploadedImages, ...newEntries]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    e.target.value = "";
  };

  const deleteImage = (indexToDelete) => {
    setUploadedImages(uploadedImages.filter((_, idx) => idx !== indexToDelete));
  };

  const toggleMethod = (method) => {
    const newMethods = new Set(selectedMethods);
    if (newMethods.has(method)) {
      newMethods.delete(method);
    } else {
      newMethods.add(method);
    }
    if (newMethods.size > 0) {
      setSelectedMethods(newMethods);
    }
  };

  const handleStart = async () => {
    if (uploadedImages.length === 0) return;

    if (selectedMethods.size === 0) {
      setError("Select at least one processing method");
      return;
    }

    try {
      setError("");
      setUploading(true);

      const files = uploadedImages.map((img) => img.file);
      const { session_id } = await authService.uploadImages(files);

      // Map the selected methods Set into what the API expects
      const method =
        selectedMethods.has("nerf") && selectedMethods.has("gaussian")
          ? "both"
          : selectedMethods.has("nerf")
            ? "nerf"
            : "gaussian";

      const statueName = `statue-${Date.now()}`;
      await authService.reconstruct(session_id, statueName, method);

      navigate("/processing", {
        state: { sessionId: session_id, statueName, method },
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate} onLogout={onLogout} username={username} />

      <main className="sm:h-[calc(100vh-9rem)] pt-31 pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`rounded-2xl p-24 text-center cursor-pointer transition-all border-2 border-dashed ${
              dragActive
                ? "bg-border/20 border-accent"
                : "bg-border/40 border-foreground"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-mono text-foreground">
                Upload Your Images Here
              </h2>
              <p className="font-mono font-normal text-muted-foreground">
                Drag and Drop or Select Files from Computer
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                JPG/PNG 20/40 images
              </p>

              <label htmlFor="file-input">
                <Button
                  asChild
                  className="bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-medium rounded-full"
                >
                  <span>Select a File</span>
                </Button>
              </label>

              <input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </motion.div>

          {/* Uploaded Images */}
          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif text-foreground">
                  Uploaded Images
                </h3>
                <span className="text-accent font-serif">
                  {uploadedImages.length}/40
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-w-min">
                  {uploadedImages.map((image, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square bg-secondary/40 rounded-lg overflow-hidden border border-border/30 group"
                    >
                      <img
                        src={image.url}
                        alt={`Upload ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => deleteImage(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <div className="bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors">
                          <X size={20} className="text-white" />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Processing Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h3 className="text-2xl font-serif text-foreground">
                PROCESSING METHODS
              </h3>
            </div>

            <div className="font-mono grid md:grid-cols-2 gap-6">
              {[
                { id: "nerf", name: "NeRF" },
                { id: "gaussian", name: "Gaussian Splatting" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => toggleMethod(method.id)}
                  className={`p-4 rounded-4xl border-2 transition-all ${
                    selectedMethods.has(method.id)
                      ? "border-accent bg-accent/10 hover:bg-accent/20"
                      : "border-accent bg-background hover:border-accent/50"
                  }`}
                >
                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-serif text-accent">
                      {method.name}
                    </h4>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {error && (
            <p className="text-sm text-red-500 text-center font-mono">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              className="border-border/50 text-foreground hover:bg-secondary px-8 py-6 rounded-full"
              onClick={() => {
                setUploadedImages([]);
                document.getElementById("file-input").value = "";
              }}
              disabled={uploadedImages.length === 0 || uploading}
            >
              Clear
            </Button>
            <Button
              onClick={handleStart}
              className="bg-accent border border-border-cream text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-medium rounded-full"
              disabled={uploadedImages.length === 0 || uploading}
            >
              {uploading ? "Uploading…" : "Start"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
