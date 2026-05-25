import React, { useState, useCallback, useRef } from "react";
import "./FileUploadComponent.css";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".txt"];

export default function FileUploadComponent({ onProcessFiles, isProcessing }) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateFiles = useCallback((fileList) => {
    const fileArray = Array.from(fileList);
    const invalid = fileArray.filter(
      (f) => !ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );

    if (invalid.length > 0) {
      setError(
        `Unsupported file(s): ${invalid.map((f) => f.name).join(", ")}. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
      );
      return null;
    }

    setError(null);
    return fileArray;
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const validFiles = validateFiles(e.dataTransfer.files);
        if (validFiles) {
          setFiles(validFiles);
        }
      }
    },
    [validateFiles]
  );

  const handleFileChange = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const validFiles = validateFiles(e.target.files);
        if (validFiles) {
          setFiles(validFiles);
        }
      }
    },
    [validateFiles]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleProcess = useCallback(() => {
    if (files.length > 0 && onProcessFiles) {
      onProcessFiles(files);
      // Clear files after processing
      setFiles([]);
      setError(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [files, onProcessFiles]);

  const handleRemoveFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="file-upload-component">
      <div
        className={`upload-area ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div className="upload-icon">📁</div>
        <p className="upload-text">
          <strong>Drag & drop files here</strong> or click to browse
        </p>
        <p className="upload-subtext">
          Supports: {ACCEPTED_EXTENSIONS.join(", ")}
        </p>
      </div>

      {error && <div className="upload-error">{error}</div>}

      {files.length > 0 && (
        <div className="files-list">
          <div className="files-header">
            <span className="files-count">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <ul className="files-items">
            {files.map((file, index) => (
              <li key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <button
                  className="btn-remove-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  disabled={isProcessing}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="btn-process-files"
        onClick={handleProcess}
        disabled={files.length === 0 || isProcessing}
      >
        {isProcessing ? "Processing..." : `Process ${files.length} File${files.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
