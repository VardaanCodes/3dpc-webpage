import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Readme() {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    fetch("/README.md")
      .then((response) => response.text())
      .then((text) => setMarkdown(text));
  }, []);

  return (
    <div className="prose prose-invert p-8 mx-auto">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
