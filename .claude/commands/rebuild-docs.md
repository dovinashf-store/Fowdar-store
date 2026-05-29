---
name: rebuild-docs
description: Regenerate the INVOICE_PROCESSING_PROMPT.docx Word document from the markdown source. Use when the user says "rebuild the Word doc", "regenerate the prompt document", or "update the docx".
---

# Rebuild Invoice Prompt Word Document

Regenerates `INVOICE_PROCESSING_PROMPT.docx` from `INVOICE_PROCESSING_PROMPT.md`.

## Steps

1. Run the build script from the project directory:
```
python3 build_prompt_docx.py
```

2. Confirm the output shows `✓ Saved N supplier pages → ...INVOICE_PROCESSING_PROMPT.docx`

3. Tell the user the Word document has been updated and how many supplier pages it contains.

## Files

- Script: `/Users/dovinashf/Desktop/fowdar store project/build_prompt_docx.py`
- Source: `/Users/dovinashf/Desktop/fowdar store project/INVOICE_PROCESSING_PROMPT.md`
- Output: `/Users/dovinashf/Desktop/fowdar store project/INVOICE_PROCESSING_PROMPT.docx`
