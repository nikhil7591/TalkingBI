"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
  StopCircle,
  Mic,
  Globe,
  BrainCog,
  FolderCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "min-h-[44px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-[#1F2023] px-3 py-1.5 text-sm text-white shadow-md",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-[#333333] bg-[#1F2023] p-0 shadow-xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033]">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const CustomDivider: React.FC = () => (
  <div className="relative mx-1 h-6 w-[1.5px]">
    <div
      className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent"
      style={{
        clipPath:
          "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const PromptInputBox = React.forwardRef(
  (props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
    const {
      onSend = () => {},
      isLoading = false,
      placeholder = "Type your message here...",
      className,
    } = props;

    const [input, setInput] = React.useState("");
    const [files, setFiles] = React.useState<File[]>([]);
    const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const [showSearch, setShowSearch] = React.useState(false);
    const [showThink, setShowThink] = React.useState(false);
    const [showCanvas, setShowCanvas] = React.useState(false);
    const uploadInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      const styleSheet = document.createElement("style");
      styleSheet.innerText = `
        *:focus-visible { outline-offset: 0 !important; }
        textarea::-webkit-scrollbar { width: 6px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background-color: #444444; border-radius: 3px; }
      `;
      document.head.appendChild(styleSheet);
      return () => {
        document.head.removeChild(styleSheet);
      };
    }, []);

    const isImageFile = (file: File) => file.type.startsWith("image/");

    const processFile = (file: File) => {
      if (!isImageFile(file) || file.size > 10 * 1024 * 1024) {
        return;
      }
      setFiles([file]);
      const reader = new FileReader();
      reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
      reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
      if (!input.trim() && files.length === 0) {
        return;
      }
      let messagePrefix = "";
      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Think: ";
      else if (showCanvas) messagePrefix = "[Canvas: ";

      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
      onSend(formattedInput, files);
      setInput("");
      setFiles([]);
      setFilePreviews({});
    };

    const hasContent = input.trim() !== "" || files.length > 0;

    return (
      <>
        <TooltipProvider>
          <div
            ref={ref}
            className={cn(
              "w-full rounded-3xl border border-[#444444] bg-[#1F2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)]",
              isRecording && "border-red-500/70",
              className
            )}
          >
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    {file.type.startsWith("image/") && filePreviews[file.name] && (
                      <div
                        className="h-16 w-16 cursor-pointer overflow-hidden rounded-xl"
                        onClick={() => setSelectedImage(filePreviews[file.name])}
                      >
                        <img src={filePreviews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFiles([]);
                            setFilePreviews({});
                          }}
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                showSearch
                  ? "Search the web..."
                  : showThink
                  ? "Think deeply..."
                  : showCanvas
                  ? "Create on canvas..."
                  : placeholder
              }
              className="text-base"
            />

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => uploadInputRef.current?.click()}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]"
                    >
                      <Paperclip className="h-5 w-5" />
                      <input
                        ref={uploadInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            processFile(e.target.files[0]);
                          }
                          if (e.target) {
                            e.target.value = "";
                          }
                        }}
                        accept="image/*"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Upload image</TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => {
                    setShowSearch((prev) => !prev);
                    setShowThink(false);
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-full border px-2 py-1 transition-all",
                    showSearch
                      ? "border-[#1EAEDB] bg-[#1EAEDB]/15 text-[#1EAEDB]"
                      : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                >
                  <motion.div animate={{ rotate: showSearch ? 360 : 0 }}>
                    <Globe className="h-4 w-4" />
                  </motion.div>
                  <AnimatePresence>
                    {showSearch && (
                      <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden whitespace-nowrap text-xs">
                        Search
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <CustomDivider />

                <button
                  type="button"
                  onClick={() => {
                    setShowThink((prev) => !prev);
                    setShowSearch(false);
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-full border px-2 py-1 transition-all",
                    showThink
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6]"
                      : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                >
                  <motion.div animate={{ rotate: showThink ? 360 : 0 }}>
                    <BrainCog className="h-4 w-4" />
                  </motion.div>
                </button>

                <CustomDivider />

                <button
                  type="button"
                  onClick={() => setShowCanvas((prev) => !prev)}
                  className={cn(
                    "flex h-8 items-center gap-1 rounded-full border px-2 py-1 transition-all",
                    showCanvas
                      ? "border-[#F97316] bg-[#F97316]/15 text-[#F97316]"
                      : "border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                >
                  <motion.div animate={{ rotate: showCanvas ? 360 : 0 }}>
                    <FolderCode className="h-4 w-4" />
                  </motion.div>
                </button>
              </div>

              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                  isRecording
                    ? "bg-transparent text-red-500 hover:bg-gray-600/30"
                    : hasContent
                    ? "bg-white text-[#1F2023] hover:bg-white/80"
                    : "bg-transparent text-[#9CA3AF] hover:bg-gray-600/30 hover:text-[#D1D5DB]"
                )}
                onClick={() => {
                  if (isLoading) return;
                  if (isRecording) setIsRecording(false);
                  else if (hasContent) handleSubmit();
                  else setIsRecording(true);
                }}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 animate-pulse fill-[#1F2023]" />
                ) : isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : hasContent ? (
                  <ArrowUp className="h-4 w-4 text-[#1F2023]" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </TooltipProvider>

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[90vw] border-none bg-transparent p-0 shadow-none md:max-w-[800px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl bg-[#1F2023] shadow-2xl"
            >
              {selectedImage && (
                <img src={selectedImage} alt="Full preview" className="max-h-[80vh] w-full rounded-2xl object-contain" />
              )}
            </motion.div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

PromptInputBox.displayName = "PromptInputBox";
