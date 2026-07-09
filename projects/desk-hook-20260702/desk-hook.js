// Desk Headphone Hook — FDM 向け 2D プロファイル（15mm 押し出し想定）
// 座標系: 机の天板上面 = y=0、机のエッジ面 = x=0（机は x>0 側）
// 肉厚 t=6mm、天板に載るアーム長 40mm、フック内径 R10
var d = new Drawing();

// 1. レイヤ定義
d.addLayer("Outline", "white");
d.addLayer("Annotation", "cyan");

// 2. ジオメトリ（閉じた外形を line + arc で構成）
// 上アーム（天板の上に載る）
d.line(-6, 6, 40, 6, "Outline");           // アーム上面
d.arc(40, 3, 3, 270, 90, "Outline");       // アーム先端の丸め（R3 半円キャップ）
d.line(40, 0, 3, 0, "Outline");            // アーム下面（天板接地面）
d.arc(3, -3, 3, 90, 180, "Outline");       // 凹コーナー R3 フィレット
// 垂直ウォール（机のエッジに沿う）
d.line(0, -3, 0, -55, "Outline");          // 内側面（机側）
d.line(-6, -55, -6, 6, "Outline");         // 外側面
// フック（下向き半円アニュラス、開口は上向き）
d.arc(-16, -55, 16, 180, 360, "Outline");  // フック外周 R16（ウォール内側面と接線連続）
d.arc(-16, -55, 10, 180, 360, "Outline");  // フック内周 R10（ヘッドホンが乗る面）
// フック先端（立ち上がり + 丸め）
d.line(-32, -55, -32, -40, "Outline");     // 先端外側
d.line(-26, -40, -26, -55, "Outline");     // 先端内側
d.arc(-29, -40, 3, 0, 180, "Outline");     // 先端 R3 半円キャップ

// 3. 注記
d.text("Desk Headphone Hook (FDM)", -40, 20, 5, "Annotation");
d.text("t=6mm / extrude 15mm / PLA or PETG", -40, 12, 3.5, "Annotation");
d.text("arm 40mm on desk top", 8, -12, 3, "Annotation");
d.text("hook R10 (opening 20mm)", -80, -68, 3, "Annotation");

// 4. 保存
d.saveAndReport(_qcadDrawOutput);
