/** @format */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, FileText, Github, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Readme() {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/README.md")
      .then((response) => response.text())
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load README:", error);
        setMarkdown(
          "# 3DPC Print Queue Management Website\n\nFailed to load README content. Please try again later."
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="mb-8">
          <Link to="/login">
            <Button
              variant="outline"
              className="mb-6 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>

          <div className="flex items-center space-x-3 mb-4">
            <FileText className="text-cyan-500 h-8 w-8" />
            <h1 className="text-3xl font-bold text-white">
              Project Documentation
            </h1>
          </div>
          <p className="text-gray-400 mb-6">
            Learn about the 3DPC platform features and demo functionality.
          </p>

          {/* GitHub Repository Card */}
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center text-lg">
                <Github className="mr-2 h-5 w-5" />
                Open Source Repository
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm mb-2">
                    This project is open source and available on GitHub.
                    Contributions, bug reports, and feature requests are
                    welcome!
                  </p>
                  <p className="text-gray-400 text-xs">
                    Help us improve the platform for educational institutions
                    and maker communities.
                  </p>
                </div>
                <Button
                  asChild
                  className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 shrink-0"
                >
                  <a
                    href="https://github.com/VardaanCodes/3dpc-webpage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* README Content */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">README</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-code:text-cyan-400 prose-code:bg-slate-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
              <ReactMarkdown
                components={{
                  // Customize link rendering to open external links in new tab
                  a: ({ href, children, ...props }) => (
                    <a
                      href={href}
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={
                        href?.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="text-cyan-400 hover:text-cyan-300 underline"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  // Enhance blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-gray-300 bg-slate-900 py-2 rounded-r">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
