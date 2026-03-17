import type { Goal } from "@/lib/types";
import { File, FileText, Music, X } from "lucide-react";
import React, { type Dispatch, type SetStateAction } from "react";

interface AttachmentProps {
  openAttachmentGoalId: number | null;
  goal: Goal;
  fileInfo: {
    type: string;
    extension: string;
    filename: string;
  } | null;
  setOpenAttachmentGoalId: Dispatch<SetStateAction<number | null>>;
}

const Attachment: React.FC<AttachmentProps> = ({
  openAttachmentGoalId,
  goal,
  fileInfo,
  setOpenAttachmentGoalId,
}) => {
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        String(openAttachmentGoalId) === goal.id
          ? "max-h-[500px] opacity-100 mt-3"
          : "max-h-0 opacity-0"
      }`}
    >
      <div className="rounded-lg bg-[#1a1a1b] shadow p-3">
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => setOpenAttachmentGoalId(null)}
            className="text-gray-400 hover:text-white p-1 cursor-pointer rounded-full hover:bg-[#3a3a3b]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2">
          {fileInfo?.type === "image" ? (
            <div className="rounded-lg overflow-hidden bg-[#1a1a1b]">
              <img
                src={String(goal.image_url)}
                alt={fileInfo.filename}
                className="w-full h-auto max-h-64 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "https://via.placeholder.com/300x200?text=Image+Not+Available";
                }}
              />
            </div>
          ) : fileInfo?.type === "video" ? (
            <div className="rounded-lg overflow-hidden bg-[#1a1a1b]">
              <video
                controls
                className="w-full h-auto max-h-64"
                preload="metadata"
              >
                <source
                  src={String(goal.image_url)}
                  type={`video/${fileInfo.extension}`}
                />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : fileInfo?.type === "audio" ? (
            <div className="rounded-lg bg-[#1a1a1b] p-4">
              <div className="flex items-center gap-3 mb-3">
                <Music size={24} className="text-green-400" />
                <div>
                  <p className="text-sm font-medium truncate">
                    {fileInfo.filename}
                  </p>
                  <p className="text-xs text-gray-400">Audio file</p>
                </div>
              </div>
              <audio controls className="w-full">
                <source
                  src={String(goal.image_url)}
                  type={`audio/${fileInfo.extension}`}
                />
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : fileInfo?.type === "document" ? (
            <div className="rounded-lg bg-[#1a1a1b] p-4 flex flex-col items-center justify-center h-40">
              <FileText size={48} className="text-red-400 mb-3" />
              <p className="text-sm font-medium mb-2">{fileInfo.filename}</p>
              <p className="text-xs text-gray-400 mb-4">
                .{fileInfo.extension.toUpperCase()} Document
              </p>
              <a
                href={String(goal.image_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-4 py-2 bg-[#58a94257] text-[#58A942] rounded-lg hover:bg-[#58a94280] transition-colors"
              >
                Open Document
              </a>
            </div>
          ) : (
            // Generic file preview
            <div className="rounded-lg bg-[#1a1a1b] p-4 flex flex-col items-center justify-center h-40">
              <File size={48} className="text-gray-400 mb-3" />
              <p className="text-sm font-medium mb-2 truncate w-full text-center">
                {fileInfo?.filename || "Unknown file"}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {fileInfo?.extension
                  ? `.${fileInfo.extension.toUpperCase()}`
                  : "File"}
              </p>
              <a
                href={String(goal.image_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-4 py-2 bg-[#58a94257] text-[#58A942] rounded-lg hover:bg-[#58a94280] transition-colors"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attachment;
