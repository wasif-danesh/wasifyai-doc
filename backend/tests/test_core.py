import unittest

from app.core import chunk_text, extract_text


class CoreTests(unittest.TestCase):
    def test_extract_text_supports_utf8_text_and_normalizes_whitespace(self):
        self.assertEqual(extract_text("notes.txt", b"  alpha\r\n\r\nbeta  "), "alpha\n\nbeta")


    def test_csv_is_converted_to_searchable_rows(self):
        self.assertEqual(extract_text("items.csv", b"name,count\napples,3\n"), "name | count\napples | 3")


    def test_extract_rejects_unsupported_formats(self):
        with self.assertRaisesRegex(ValueError, "Unsupported file type"):
            extract_text("report.pdf", b"not parsed yet")


    def test_chunk_text_overlaps_and_preserves_all_words(self):
        chunks = chunk_text("one two three four five six", chunk_size=4, overlap=1)
        self.assertEqual([chunk.text for chunk in chunks], ["one two three four", "four five six"])
        self.assertEqual([chunk.index for chunk in chunks], [0, 1])


    def test_chunk_text_validates_overlap(self):
        with self.assertRaises(ValueError):
            chunk_text("text", chunk_size=3, overlap=3)


if __name__ == "__main__":
    unittest.main()
