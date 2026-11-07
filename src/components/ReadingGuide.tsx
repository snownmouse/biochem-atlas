import { useId, useState } from "react";

type Props = {
  label: string;
  summary: string;
  paragraphs: string[];
};

/**
 * 挂图页导读：默认收起为一行摘要，点开显示全文。
 * 样式限定在 .reading-guide 作用域；按钮为原生 button，Enter/Space 可直接切换。
 */
export default function ReadingGuide({ label, summary, paragraphs }: Props) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <section className="reading-guide" aria-label={label}>
      <div className="rg-line">
        <span className="rg-summary">{summary}</span>
        <button
          type="button"
          className="rg-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起" : "展开解读"}
        </button>
      </div>
      <div className="rg-body" id={bodyId} hidden={!open}>
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </section>
  );
}
