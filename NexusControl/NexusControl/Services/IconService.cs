using AntdUI.Svg;
using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Text.RegularExpressions;

namespace NexusControl.Services
{
    public static class IconService
    {
        private static readonly string IconDirectory =
            Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "Resources",
                "Icons"
            );

        private static readonly Dictionary<string, string> Cache =
            new Dictionary<string, string>(
                StringComparer.OrdinalIgnoreCase
            );

        public static string GetSvg(string name, string? stroke = null, string? fill = null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException(
                    "Tên icon không được để trống.",
                    nameof(name)
                );

            // Chỉ chấp nhận tên file, không cho truyền đường dẫn tùy ý.
            if (name != Path.GetFileName(name) ||
                name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            {
                throw new ArgumentException(
                    "Tên icon không hợp lệ.",
                    nameof(name)
                );
            }

            string fileName = name.EndsWith(
                ".svg",
                StringComparison.OrdinalIgnoreCase
            ) ? name : name + ".svg";


            if (Cache.TryGetValue(fileName, out string cachedSvg))
                return cachedSvg;

            string path = Path.Combine(IconDirectory, fileName);

            if (!File.Exists(path))
            {
                MessageBox.Show(
                    $"Không tìm thấy icon '{path}'.",
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                throw new FileNotFoundException(
                    $"Không tìm thấy icon '{fileName}'.",
                    path
                );
            }

            string svg = File.ReadAllText(path);
            if(string.IsNullOrWhiteSpace(svg))
            {
                MessageBox.Show(
                    $"Icon '{path}' rỗng.",
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                throw new InvalidDataException(
                    $"Icon '{fileName}' rỗng."
                );
            }
            if (!string.IsNullOrWhiteSpace(stroke))
            {
                svg = Regex.Replace(
                    svg,
                    @"\bstroke\s*=\s*""[^""]*""",
                    $"stroke=\"{stroke}\"");
            }
           

            if (!string.IsNullOrWhiteSpace(fill))
            {
                svg = Regex.Replace(
                    svg,
                    @"\bfill\s*=\s*""[^""]*""",
                    $"fill=\"{fill}\"");
            }
         

            Cache[fileName] = svg;

            return svg;
        }
    }
}
