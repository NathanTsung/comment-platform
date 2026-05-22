import { useRef, useState } from 'react'
import './App.css'

function FileUploadSection({ file, onFileSelect, documentName, onDocumentNameChange, documentType, onDocumentTypeChange, onUpload, isUploading }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }

  return (
    <section className="card">
      <h2>Upload Section</h2>
      <div
        className="file-drop-zone"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <p>Drag and drop a file here, or click to select</p>
        <p className="file-hint">Accepted: .csv, .xlsx, .docx</p>
        <p className="file-name">{file ? `Selected: ${file.name}` : 'No file selected'}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.docx"
        className="hidden-input"
        onChange={handleFileChange}
      />

      <div className="form-row">
        <label htmlFor="document-name">Document Name</label>
        <input
          id="document-name"
          type="text"
          value={documentName}
          onChange={(event) => onDocumentNameChange(event.target.value)}
          placeholder="Enter document name"
        />
      </div>

      <div className="form-row">
        <label htmlFor="document-type">Document Type</label>
        <select
          id="document-type"
          value={documentType}
          onChange={(event) => onDocumentTypeChange(event.target.value)}
        >
          <option value="Incoming">Incoming</option>
          <option value="Outgoing">Outgoing</option>
          <option value="CSV Comments">CSV Comments</option>
        </select>
      </div>

      <button type="button" onClick={onUpload} disabled={!file || isUploading}>
        Upload Document
      </button>
    </section>
  )
}

function UploadStatus({ status, file }) {
  const progress = status === 'Completed' ? 100 : status === 'Uploading' ? 60 : 0

  return (
    <section className="card">
      <h2>Upload Status</h2>
      <p>Status: <strong>{status}</strong></p>
      <p>Selected file: {file?.name ?? 'None'}</p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </section>
  )
}

function RecentUploadsTable({ items }) {
  return (
    <section className="card">
      <h2>Recent Uploads</h2>
      <table>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Document Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Upload Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-row">No uploads yet</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>{item.fileName}</td>
                <td>{item.documentName}</td>
                <td>{item.documentType}</td>
                <td>{item.status}</td>
                <td>{item.uploadTimestamp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

function UploadPage() {
  const [file, setFile] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [documentType, setDocumentType] = useState('Incoming')
  const [uploadStatus, setUploadStatus] = useState('Idle')
  const [uploadedHistory, setUploadedHistory] = useState([])

  const handleUpload = () => {
    if (!file) {
      return
    }

    setUploadStatus('Uploading')

    setTimeout(() => {
      setUploadStatus('Completed')
      setUploadedHistory((previous) => [
        {
          id: `${Date.now()}-${file.name}`,
          fileName: file.name,
          documentName: documentName || file.name,
          documentType,
          status: 'Completed',
          uploadTimestamp: new Date().toLocaleString(),
        },
        ...previous,
      ])
    }, 1000)
  }

  return (
    <main className="upload-page">
      <header className="page-header">
        <h1>Document Upload</h1>
        <p>Upload files for comment extraction and tracking</p>
      </header>

      <FileUploadSection
        file={file}
        onFileSelect={setFile}
        documentName={documentName}
        onDocumentNameChange={setDocumentName}
        documentType={documentType}
        onDocumentTypeChange={setDocumentType}
        onUpload={handleUpload}
        isUploading={uploadStatus === 'Uploading'}
      />

      <UploadStatus status={uploadStatus} file={file} />

      <RecentUploadsTable items={uploadedHistory} />
    </main>
  )
}

export default UploadPage
