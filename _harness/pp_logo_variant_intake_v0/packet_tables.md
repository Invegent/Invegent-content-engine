### Accepted files (18)

| # | source file | asset_key | dims | bytes | fmt | alpha | sha256 |
|---|---|---|---|---|---|---|---|
| 1 | `vector/pp_logo_master.svg` | `pp_logo_master_svg` | vector | 6951 | svg | yes | `71923fd4642a062c1edb1e185808db192f1957aa7d2663091a8daabebd9ef053` |
| 2 | `vector/pp_logo_master_editable.svg` | `pp_logo_master_editable_svg` | vector | 800 | svg | yes | `e971759e807f822793bc55020bdbe16f670a07ea52b9d0f14be04ac32a8b31fe` |
| 3 | `vector/pp_logo_full_colour.svg` | `pp_logo_full_colour_svg` | vector | 6951 | svg | yes | `f12765b3d84fccc2191f4998788f8806a05b6dfb00f64d30f6c31ef4f166ecb0` |
| 4 | `vector/pp_logo_white.svg` | `pp_logo_white_svg` | vector | 6951 | svg | yes | `29d2fff49a25a7cf3f27d7b02790703eca3d51b4a0bf1f0387ffef1a4944368b` |
| 5 | `vector/pp_logo_dark.svg` | `pp_logo_dark_svg` | vector | 6951 | svg | yes | `b1800cd2e63ceec21e4570416f43e4c088cf8e229711724659b4a8ed37c91553` |
| 6 | `vector/pp_logo_mark_only.svg` | `pp_logo_mark_only_svg` | vector | 623 | svg | yes | `3cb8563bb1621c80db92ce7a19ba02e09ef511bf77b98f2658372c0a852fe115` |
| 7 | `vector/pp_logo_mark_only_dark.svg` | `pp_logo_mark_only_dark_svg` | vector | 623 | svg | yes | `0c2892c76eb37ef15e5bdbfe719299171673d7366ef4c0229875395a49550ee2` |
| 8 | `vector/pp_logo_master_transparent_512.png` | `pp_logo_master_png_512` | 512x274 | 25361 | png | yes | `88cc62acb980e9494908aa5184bd4299aee4a2989d9071220efc6b5ac8926751` |
| 9 | `vector/pp_logo_master_transparent_1024.png` | `pp_logo_master_png_1024` | 1024x547 | 57316 | png | yes | `69d9697c220bd64fe09cce9a6ad5396541dd85cbe35e481c28ceb7259b2e5697` |
| 10 | `vector/pp_logo_master_transparent_2048.png` | `pp_logo_master_png_2048` | 2048x1095 | 136752 | png | yes | `308cc34c2b0ff2875cb91224865750500d7d5e951768766f654a4a599430086f` |
| 11 | `vector/pp_logo_full_colour_1024.png` | `pp_logo_full_colour_png_1024` | 1024x547 | 61891 | png | yes | `9423a7b619bed6117e8c1f926a50b34c983af8ee695caae3c885996795cf7864` |
| 12 | `vector/pp_logo_white_1024.png` | `pp_logo_white_png_1024` | 1024x547 | 50690 | png | yes | `8f90163fd5968867423997670e05eba67f8cfcad742596906c923de9b8cee1b5` |
| 13 | `vector/pp_logo_dark_1024.png` | `pp_logo_dark_png_1024` | 1024x547 | 60522 | png | yes | `af725d11040d03d0320ac5424f7cb8385eb9a53157ddef3ac5a90c427b74ad61` |
| 14 | `assets/pp_logo_mark_only_transparent_512.png` | `pp_logo_mark_only_png_512` | 512x512 | 21082 | png | yes | `5a05207747a09e68f0ba7fe05745cc7738bdfdac74df2b74bef2db242e06b092` |
| 15 | `assets/pp_logo_mark_only_transparent_1024.png` | `pp_logo_mark_only_png_1024` | 1024x1024 | 71599 | png | yes | `5c612982d3e67020cceefd777e701ab283ff695c964546a3b1287f5bc87b0e37` |
| 16 | `assets/pp_logo_square_navy_bg_512.png` | `pp_logo_square_navy_bg_png_512` | 512x512 | 30592 | png | no (solid navy) | `4d51bba8e1d775e00bb624d74ec8a649a6c08a12ee8e0ad5c09333e65a2a4966` |
| 17 | `assets/pp_logo_square_navy_bg_1024.png` | `pp_logo_square_navy_bg_png_1024` | 1024x1024 | 73754 | png | no (solid navy) | `0956757dcc6488d6955549eae0875a5fb08ea1d0990086a279160cf2726cea3c` |
| 18 | `assets/pp_logo_watermark_white_transparent.png` | `pp_logo_watermark_white_png` | 800x428 | 45489 | png | yes | `dc4734d561c985f9496f74a9c8d6fec4413785ce54f07310d7571d3a584ed497` |

### Rejected / do-not-intake (8)

| source file | sha256 (12) | reason |
|---|---|---|
| `assets/pp_logo_horizontal_transparent_1024.png` | `c10dba390eb3` | byte-identical duplicate of assets/pp_logo_full_colour_transparent.png (source has a single lockup; horizontal = same artwork) |
| `assets/pp_logo_horizontal_white_transparent_1024.png` | `1bbcbebe5854` | byte-identical duplicate of assets/pp_logo_white_transparent.png |
| `assets/pp_logo_master_transparent.png` | `8d6808479863` | raster-derived export superseded by the crisper SVG render vector/pp_logo_master_transparent_1024.png (same 1024x547 role) |
| `assets/pp_logo_full_colour_transparent.png` | `c10dba390eb3` | raster-derived export superseded by vector/pp_logo_full_colour_1024.png |
| `assets/pp_logo_white_transparent.png` | `1bbcbebe5854` | raster-derived export superseded by vector/pp_logo_white_1024.png |
| `assets/pp_logo_dark_transparent.png` | `d78def1cd551` | raster-derived export superseded by vector/pp_logo_dark_1024.png |
| `uploads/PP_logo.png` | `feafee4e4452` | source raster; byte-identical to live production Property_Pulse/Logos/PP_logo_2.png - evidence only, never re-uploaded |
| `uploads/PP_logo_2.png` | `feafee4e4452` | byte-identical duplicate of uploads/PP_logo.png - evidence only |

### Evidence files (kept in harness, not uploaded)

- `vector/comparison_raster_vs_svg.png` (479786 B, sha256 `f3d8dd1a9c9b…`)
- `vector/font_compare.png` (175241 B, sha256 `135ad0f00549…`)
- `vector/font_compare2.png` (230511 B, sha256 `90ca0e395122…`)
- `vector/text_closeup.png` (515484 B, sha256 `c59790b1f5b1…`)
- `vector/weight_compare.png` (311653 B, sha256 `32103229614c…`)
- `vector/traced.json` (918 B, sha256 `374edf36c128…`)
- `vector/pp_logo_vector_metadata.csv` (1865 B, sha256 `8325a3f1aae8…`)
- `assets/pp_logo_metadata.csv` (2468 B, sha256 `85e4114fc02c…`)
- `uploads/primary_colors.txt` (613 B, sha256 `2ff8f2185dfd…`)
- `Logo_Kit_Contact_Sheet.dc.html` (25584 B, sha256 `d9e545dd628e…`)
- `Logo_Kit_Contact_Sheet-print-1anzf8b.dc.html` (43895 B, sha256 `f2c26f5924dc…`)
