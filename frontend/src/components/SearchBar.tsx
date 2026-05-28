import { useState, type ChangeEvent } from "react";

interface ExcelUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export default function ExcelUploader({ onUpload, isLoading }: ExcelUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile && !isLoading) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="hero-search">
      <h1 className="hero-search-title">อัปโหลดข้อมูลงบการเงิน</h1>
      <p className="hero-search-subtitle">
        ดาวน์โหลดเทมเพลต กรอกข้อมูล และอัปโหลดไฟล์ Excel ของคุณเพื่อสร้างกราฟ
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
        <a 
          href="http://localhost:8080/api/template" 
          download 
          className="btn-secondary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          ดาวน์โหลดเทมเพลต Excel
        </a>
      </div>

      <div className="search-input-wrapper" style={{ flexDirection: "column", gap: "15px", alignItems: "stretch", background: "rgba(255, 255, 255, 0.03)", padding: "20px", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.2)" }}>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          disabled={isLoading}
          style={{ color: "var(--color-text)", background: "transparent", border: "none", width: "100%" }}
        />

        <button
          onClick={handleUploadClick}
          disabled={isLoading || !selectedFile}
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {isLoading ? (
            <>
              <span
                className="spinner"
                style={{
                  width: "18px",
                  height: "18px",
                  borderWidth: "2px",
                  borderColor: "rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                }}
              />
              <span>กำลังอัปโหลด...</span>
            </>
          ) : (
            <>
              <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>อัปโหลดไฟล์ Excel</span>
            </>
          )}
        </button>
      </div>
      
      {isLoading && (
        <div className="loading-overlay" style={{ padding: "24px 0", position: "relative", background: "transparent" }}>
          <div className="pulse-dot" />
          <div style={{ textAlign: "center" }}>
            <p className="loading-text">กำลังประมวลผลไฟล์...</p>
          </div>
        </div>
      )}
    </div>
  );
}
