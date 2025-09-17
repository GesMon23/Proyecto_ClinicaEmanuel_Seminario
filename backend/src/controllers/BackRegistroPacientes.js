/* Router: BackRegistroPacientes.js
   Contiene todos los endpoints que antes estaban en server.js
*/
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const QRCode = require("qrcode");
const pool = require("./db/pool");

// ---------- Carpetas estáticas (aseguramos que existan) ----------
const fotosDir = path.join(__dirname, "fotos");
const carnetsDir = path.join(__dirname, "carnets");
const tmpDir = path.join(__dirname, "tmp");
[fotosDir, carnetsDir, tmpDir, path.join(__dirname, "assets", "img")].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

router.use("/fotos", express.static(fotosDir));
router.use("/carnets", express.static(carnetsDir));
if (fs.existsSync(path.join(__dirname, "assets"))) {
  router.use("/assets", express.static(path.join(__dirname, "assets")));
}

// ---------- Utils ----------
async function saveBase64Image(input, targetFilenameWithoutExt) {
  let base64 = input;
  let ext = "jpg";

  if (typeof base64 !== "string") {
    throw new Error("La imagen debe ser una cadena base64 o data URL.");
  }
  if (base64.startsWith("data:image/")) {
    const m = base64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
    if (!m) throw new Error("Formato de imagen inválido (JPEG/PNG base64).");
    ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
    base64 = m[2];
  }
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64) || !base64.trim()) {
    throw new Error("La cadena base64 de la imagen no es válida.");
  }
  const filename = `${targetFilenameWithoutExt}.${ext}`;
  const filePath = path.join(fotosDir, filename);
  await fs.promises.writeFile(filePath, base64, "base64");
  return filename;
}

async function definirCarnetPaciente(pacienteData, fotoPath, carnetPath) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const writeStream = fs.createWriteStream(carnetPath);
  doc.pipe(writeStream);

  const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
  if (fs.existsSync(logoPath)) doc.image(logoPath, 30, 25, { width: 60 });
  doc.font("Helvetica-Bold").fontSize(22).fillColor("black").text("Carné de Paciente", 110, 35);

  if (fotoPath && fs.existsSync(fotoPath)) {
    doc.rect(430, 25, 90, 70).fillAndStroke("white", "#bbb");
    doc.image(fotoPath, 432, 27, { width: 86, height: 66, fit: [86, 66] });
  } else {
    doc.rect(430, 25, 90, 70).fillAndStroke("white", "#bbb");
    doc.font("Helvetica").fontSize(12).fillColor("#888").text("Sin Foto", 450, 60);
  }

  const qrUrl = `http://localhost:3000/consulta-pacientes?noafiliacion=${encodeURIComponent(
    pacienteData.noafiliacion || pacienteData.no_afiliacion || ""
  )}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 70 });
  doc.image(Buffer.from(qrDataUrl.split(",")[1], "base64"), 450, 105, { width: 50, height: 50 });
  doc.font("Helvetica").fontSize(8).fillColor("black").text("Escanee para ver\ninformación", 445, 158, { width: 65, align: "center" });

  const fmt = (fecha) => {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  let y = 100;
  const nombre = [pacienteData.primernombre, pacienteData.segundonombre, pacienteData.otrosnombres]
    .filter(Boolean).join(" ").replace(/ +/g, " ").trim();
  const apellido = [pacienteData.primerapellido, pacienteData.segundoapellido, pacienteData.apellidocasada]
    .filter(Boolean).join(" ").replace(/ +/g, " ").trim();

  doc.font("Helvetica").fontSize(11).fillColor("black");
  doc.text("Nombres:", 30, y, { continued: true }).font("Helvetica-Bold").text(nombre); y += 15;
  doc.font("Helvetica").text("Apellidos:", 30, y, { continued: true }).font("Helvetica-Bold").text(apellido); y += 15;
  doc.font("Helvetica").text("Dirección:", 30, y, { continued: true }).font("Helvetica-Bold").text(`${pacienteData.direccion || ""}`); y += 15;
  doc.font("Helvetica").text("Fecha Nacimiento:", 30, y, { continued: true }).font("Helvetica-Bold").text(fmt(pacienteData.fechanacimiento || pacienteData.fecha_nacimiento)); y += 15;
  doc.font("Helvetica").text("Fecha Ingreso:", 30, y, { continued: true }).font("Helvetica-Bold").text(fmt(pacienteData.fechaingreso || pacienteData.fecha_ingreso)); y += 15;
  doc.font("Helvetica").text("No. Afiliación:", 30, y, { continued: true }).font("Helvetica-Bold").text(`${pacienteData.noafiliacion || pacienteData.no_afiliacion || ""}`); y += 15;
  doc.font("Helvetica").text("DPI:", 30, y, { continued: true }).font("Helvetica-Bold").text(`${pacienteData.dpi || ""}`); y += 15;
  doc.font("Helvetica").text("Sexo:", 30, y, { continued: true }).font("Helvetica-Bold").text(`${pacienteData.sexo || ""}`); y += 20;

  // tabla firmas
  doc.moveTo(30, y + 18).lineTo(540, y + 18).lineWidth(1).strokeColor("black").stroke();
  const tableTop = y + 35;
  const colX = [30, 105, 210, 390, 540];
  const rowHeight = 24;
  const numRows = 16;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("black");
  doc.text("Fecha", colX[0] + 2, tableTop + 7, { width: colX[1] - colX[0] - 4, align: "center" });
  doc.text("Hora", colX[1] + 2, tableTop + 7, { width: colX[2] - colX[1] - 4, align: "center" });
  doc.text("Observaciones", colX[2] + 2, tableTop + 7, { width: colX[3] - colX[2] - 4, align: "center" });
  doc.text("Firma", colX[3] + 2, tableTop + 7, { width: colX[4] - colX[3] - 4, align: "center" });
  doc.font("Helvetica").fillColor("black");

  for (let i = 0; i <= numRows + 1; i++) {
    const yy = tableTop + i * rowHeight;
    doc.moveTo(colX[0], yy).lineTo(colX[4], yy).strokeColor("black").stroke();
  }
  for (let i = 0; i < colX.length; i++) {
    doc.moveTo(colX[i], tableTop).lineTo(colX[i], tableTop + (numRows + 1) * rowHeight).strokeColor("black").stroke();
  }

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

// --------------------------------------------------
//  Fotos
// --------------------------------------------------
router.post("/upload-foto/:noAfiliacion", async (req, res) => {
  const { noAfiliacion } = req.params;
  const { imagenBase64 } = req.body;
  if (!imagenBase64) return res.status(400).json({ detail: "No se recibió la imagen." });

  try {
    const check = await pool.query("SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1", [noAfiliacion]);
    if (check.rowCount === 0) return res.status(404).json({ detail: "Paciente no encontrado." });

    const filename = await saveBase64Image(imagenBase64, String(noAfiliacion));
    await pool.query("UPDATE public.tbl_pacientes SET url_foto = $1 WHERE no_afiliacion = $2", [filename, noAfiliacion]);
    return res.json({ success: true, url: `/fotos/${filename}` });
  } catch (err) {
    console.error("Error al subir foto:", err);
    return res.status(500).json({ detail: "Error al guardar la foto." });
  }
});

router.post("/upload-photo", async (req, res) => {
  try {
    const { noAfiliacion, photo } = req.body;
    if (!noAfiliacion || !photo) return res.status(400).json({ success: false, message: "Faltan datos requeridos." });

    const existe = await pool.query("SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1", [noAfiliacion]);
    if (existe.rowCount === 0) return res.status(404).json({ success: false, message: "Paciente no encontrado." });

    const filename = await saveBase64Image(photo, String(noAfiliacion));
    await pool.query("UPDATE public.tbl_pacientes SET url_foto = $1 WHERE no_afiliacion = $2", [filename, noAfiliacion]);

    return res.json({ success: true, message: "Foto guardada exitosamente", url: `/fotos/${filename}` });
  } catch (error) {
    console.error("Error al guardar la foto:", error);
    return res.status(500).json({ success: false, message: "Error interno al guardar la foto: " + error.message });
  }
});

router.get("/check-photo/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(fotosDir, filename);
  res.json({ exists: fs.existsSync(filePath) });
});

// --------------------------------------------------
//  Carné
// --------------------------------------------------
router.get("/carnet/:noafiliacion", async (req, res) => {
  try {
    const noafiliacion = req.params.noafiliacion;
    const carnetPath = path.join(carnetsDir, `${noafiliacion}_carnet.pdf`);

    if (!fs.existsSync(carnetPath)) {
      const result = await pool.query(
        `SELECT no_afiliacion, dpi, primer_nombre, segundo_nombre, otros_nombres,
                primer_apellido, segundo_apellido, apellido_casada,
                direccion, fecha_nacimiento, fecha_ingreso, sexo, url_foto
           FROM public.tbl_pacientes
          WHERE no_afiliacion = $1`,
        [noafiliacion]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Paciente no encontrado." });
      const r = result.rows[0];

      const pacienteData = {
        primernombre: r.primer_nombre,
        segundonombre: r.segundo_nombre,
        otrosnombres: r.otros_nombres,
        primerapellido: r.primer_apellido,
        segundoapellido: r.segundo_apellido,
        apellidocasada: r.apellido_casada,
        direccion: r.direccion,
        fechanacimiento: r.fecha_nacimiento,
        fechaingreso: r.fecha_ingreso,
        noafiliacion: r.no_afiliacion,
        dpi: r.dpi,
        sexo: r.sexo,
      };

      let fotoPath = null;
      if (r.url_foto) {
        const candidato = path.join(fotosDir, r.url_foto);
        if (fs.existsSync(candidato)) fotoPath = candidato;
      } else {
        const jpg = path.join(fotosDir, `${noafiliacion}.jpg`);
        const png = path.join(fotosDir, `${noafiliacion}.png`);
        if (fs.existsSync(jpg)) fotoPath = jpg;
        else if (fs.existsSync(png)) fotoPath = png;
      }
      await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${noafiliacion}_carnet.pdf"`);
    const carnetBuffer = await fs.promises.readFile(carnetPath);
    res.status(200).end(carnetBuffer);
  } catch (error) {
    console.error("Error al descargar o generar el carné:", error);
    res.status(500).json({ error: "Error al descargar o generar el carné." });
  }
});

router.get("/carnet/forzar/:noafiliacion", async (req, res) => {
  try {
    const noafiliacion = req.params.noafiliacion;
    const result = await pool.query(
      `SELECT no_afiliacion, dpi, primer_nombre, segundo_nombre, otros_nombres,
              primer_apellido, segundo_apellido, apellido_casada,
              direccion, fecha_nacimiento, fecha_ingreso, sexo, url_foto
         FROM public.tbl_pacientes
        WHERE no_afiliacion = $1`,
      [noafiliacion]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Paciente no encontrado" });
    const p = result.rows[0];

    let fotoPath = null;
    if (p.url_foto) {
      const candidato = path.join(fotosDir, p.url_foto);
      if (fs.existsSync(candidato)) fotoPath = candidato;
    } else {
      const jpg = path.join(fotosDir, `${noafiliacion}.jpg`);
      const png = path.join(fotosDir, `${noafiliacion}.png`);
      if (fs.existsSync(jpg)) fotoPath = jpg;
      else if (fs.existsSync(png)) fotoPath = png;
    }

    const carnetPath = path.join(tmpDir, `carnet_${noafiliacion}_${Date.now()}.pdf`);
    const pacienteData = {
      primernombre: p.primer_nombre,
      segundonombre: p.segundo_nombre,
      otrosnombres: p.otros_nombres,
      primerapellido: p.primer_apellido,
      segundoapellido: p.segundo_apellido,
      apellidocasada: p.apellido_casada,
      direccion: p.direccion,
      fechanacimiento: p.fecha_nacimiento,
      fechaingreso: p.fecha_ingreso,
      noafiliacion: p.no_afiliacion,
      dpi: p.dpi,
      sexo: p.sexo,
    };

    await definirCarnetPaciente(pacienteData, fotoPath, carnetPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="carnet_${noafiliacion}.pdf"`);
    const stream = fs.createReadStream(carnetPath);
    stream.pipe(res);
    stream.on("end", () => fs.unlink(carnetPath, () => {}));
  } catch (error) {
    res.status(500).json({ error: "Error al generar el carné.", detalle: error.message });
  }
});

// --------------------------------------------------
//  Referencias
// --------------------------------------------------
router.post("/api/referencias", async (req, res) => {
  const { noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia } = req.body;
  if (!noafiliacion || !fechareferencia || !motivotraslado || !idmedico || !especialidadreferencia) {
    return res.status(400).json({ detail: "Todos los campos son obligatorios." });
  }
  try {
    const result = await pool.query("SELECT MAX(idreferencia) as maxid FROM tbl_referencias");
    const newId = (result.rows[0].maxid || 0) + 1;
    await pool.query(
      `INSERT INTO tbl_referencias
       (idreferencia, noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId, noafiliacion, fechareferencia, motivotraslado, idmedico, especialidadreferencia]
    );
    res.json({ success: true, idreferencia: newId });
  } catch (err) {
    console.error("Error al registrar referencia:", err);
    res.status(500).json({ detail: "Error al registrar referencia." });
  }
});

router.get("/api/referencias", async (req, res) => {
  try {
    let baseQuery = `
      SELECT r.idreferencia, r.noafiliacion, p.primernombre, p.segundonombre, p.primerapellido, p.segundoapellido,
             r.fechareferencia, r.motivotraslado, r.idmedico, m.nombrecompleto AS nombremedico, r.especialidadreferencia
      FROM tbl_referencias r
      LEFT JOIN tbl_pacientes p ON r.noafiliacion = p.noafiliacion
      LEFT JOIN tbl_medicos m ON r.idmedico = m.idmedico
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (req.query.desde) { baseQuery += ` AND r.fechareferencia >= $${idx++}`; params.push(req.query.desde); }
    if (req.query.hasta) { baseQuery += ` AND r.fechareferencia <= $${idx++}`; params.push(req.query.hasta); }
    if (req.query.idmedico) { baseQuery += ` AND r.idmedico = $${idx++}`; params.push(req.query.idmedico); }
    baseQuery += " ORDER BY r.idreferencia DESC";
    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al consultar referencias:", err);
    res.status(500).json({ detail: "Error al consultar referencias." });
  }
});

router.get("/medicos", async (_req, res) => {
  try {
    const result = await pool.query("SELECT idmedico, nombrecompleto FROM tbl_medicos WHERE estado = true ORDER BY nombrecompleto ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// --------------------------------------------------
//  Catálogos
// --------------------------------------------------
router.get("/departamentos", async (_req, res) => {
  const qFunc = `
    SELECT id_departamento AS iddepartamento, nombre
    FROM public.fn_mostrar_departamentos()
    ORDER BY nombre ASC
  `;
  const qTabla = `
    SELECT id_departamento AS iddepartamento, nombre
    FROM public.tbl_departamento
    ORDER BY nombre ASC
  `;
  try {
    const r1 = await pool.query(qFunc);
    return res.json(r1.rows);
  } catch (e1) {
    try {
      const r2 = await pool.query(qTabla);
      return res.json(r2.rows);
    } catch (e2) {
      console.error("[/departamentos] ERROR:", e1.message, "| fallback:", e2.message);
      return res.status(500).json({ error: "DB_ERROR" });
    }
  }
});

router.get("/accesos-vasculares", async (_req, res) => {
  const qFunc = `
    SELECT id_acceso AS idacceso, descripcion
    FROM public.fn_mostrar_accesos_vascular()
    ORDER BY descripcion ASC
  `;
  const qTabla = `
    SELECT id_acceso AS idacceso, descripcion
    FROM public.tbl_acceso_vascular
    WHERE COALESCE(estado, true) = true
    ORDER BY descripcion ASC
  `;
  try {
    const r1 = await pool.query(qFunc);
    return res.json(r1.rows);
  } catch (e1) {
    try {
      const r2 = await pool.query(qTabla);
      return res.json(r2.rows);
    } catch (e2) {
      console.error("[/accesos-vasculares] ERROR:", e1.message, "| fallback:", e2.message);
      return res.status(500).json({ error: "DB_ERROR" });
    }
  }
});

router.get("/jornadas", async (_req, res) => {
  try {
    const result = await pool.query("SELECT idjornada, descripcion, dias FROM tbl_jornadas WHERE estado=true ORDER BY descripcion ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener jornadas." });
  }
});

router.get("/estados-paciente", async (_req, res) => {
  try {
    const result = await pool.query("SELECT idestado, descripcion FROM tbl_estadospaciente ORDER BY descripcion ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("[/estados-paciente]", error);
    res.status(500).json({ error: "Error al obtener los estados de paciente.", detalle: error.message });
  }
});

// --------------------------------------------------
//  Pacientes (consultas para reportes/consulta puntual)
// --------------------------------------------------
router.get("/api/faltistas", async (req, res) => {
  try {
    const { fechainicio, fechafin } = req.query;
    let query = `
      SELECT 
          pac.noafiliacion,  
          pac.primernombre, 
          pac.segundonombre, 
          pac.otrosnombres, 
          pac.primerapellido, 
          pac.segundoapellido, 
          pac.apellidocasada,
          pac.sexo,
          cli.descripcion as clinica,
          to_char(fal.fechafalta, 'YYYY-MM-DD') as fechafalta,
          fal.motivofalta
      FROM tbl_faltistas fal
        INNER JOIN tbl_clinica cli ON fal.idclinica = cli.idsala
        INNER JOIN tbl_pacientes pac ON pac.noafiliacion = fal.noafiliacion
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (fechainicio) { query += ` AND fal.fechafalta >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { query += ` AND fal.fechafalta <= $${idx++}`; params.push(fechafin); }
    query += " ORDER BY fal.fechafalta DESC";
    const result = await pool.query(query, params);
    const faltistas = result.rows.map((f) => ({
      noafiliacion: f.noafiliacion,
      nombres: [f.primernombre, f.segundonombre, f.otrosnombres].filter(Boolean).join(" "),
      apellidos: [f.primerapellido, f.segundoapellido, f.apellidocasada].filter(Boolean).join(" "),
      sexo: f.sexo, clinica: f.clinica, fechafalta: f.fechafalta, motivofalta: f.motivofalta,
    }));
    res.json(faltistas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: "Error al obtener los faltistas" });
  }
});

router.get("/api/pacientes", async (req, res) => {
  try {
    const { fechainicio, fechafin, estado, numeroformulario } = req.query;
    let baseQuery = `
      SELECT 
        pac.noafiliacion as noafiliacion,
        pac.dpi as dpi,
        pac.nopacienteproveedor as nopacienteproveedor,
        pac.primernombre as primernombre,
        pac.segundonombre as segundonombre,
        pac.otrosnombres as otrosnombres,
        pac.primerapellido as primerapellido,
        pac.segundoapellido as segundoapellido,
        pac.apellidocasada as apellidocasada,
        TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
        pac.sexo as sexo,
        pac.direccion as direccion,
        dep.nombre as departamento,
        TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
        est.descripcion as estado,
        jor.descripcion as jornada,
        acc.descripcion as accesovascular,
        pac.numeroformulario as numeroformulario,
        TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
        TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
        pac.sesionesautorizadasmes as sesionesautorizadasmes,
        pac.sesionesrealizadasmes as sesionesrealizadasmes,
        pac.fechanacimiento as fechanacimiento_raw,
        pac.idcausa as idcausa,
        pac.causaegreso as causaegreso,
        pac.comorbilidades as comorbilidades,
        pac.lugarfallecimiento as lugarfallecimiento,
        pac.causafallecimiento as causafallecimiento,
        cau.descripcion as causaegreso_descripcion,
        To_Char(pac.fechaegreso, 'YYYY-MM-DD') as fechaegreso,
        pac.nocasoconcluido as nocasoconcluido
      FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
        LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;
    if (fechainicio) { baseQuery += ` AND pac.fechainicioperiodo >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { baseQuery += ` AND pac.fechainicioperiodo <= $${idx++}`; params.push(fechafin); }
    if (estado) { baseQuery += ` AND est.descripcion = $${idx++}`; params.push(estado); }
    if (numeroformulario) { baseQuery += ` AND pac.numeroformulario ILIKE $${idx++}`; params.push(`%${numeroformulario}%`); }
    baseQuery += " ORDER BY pac.fechainicioperiodo DESC LIMIT 100";

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar pacientes para el reporte.", detalle: error.message });
  }
});

router.get("/pacientes/:noafiliacion", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*, 
        d.nombre AS departamento_nombre,
        e.descripcion AS estado_descripcion,
        a.descripcion AS acceso_descripcion,
        c.descripcion AS causaegreso_descripcion,
        j.descripcion AS jornada_descripcion
      FROM tbl_pacientes p
        LEFT JOIN tbl_departamentos d ON p.iddepartamento = d.iddepartamento
        LEFT JOIN tbl_estadospaciente e ON p.idestado = e.idestado
        LEFT JOIN tbl_accesovascular a ON p.idacceso = a.idacceso
        LEFT JOIN tbl_causaegreso c ON p.idcausa = c.idcausa
        LEFT JOIN tbl_jornadas j ON p.idjornada = j.idjornada
      WHERE p.noafiliacion = $1
    `;
    const result = await pool.query(query, [req.params.noafiliacion]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Paciente no encontrado." });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener paciente.", detalle: error.message });
  }
});

router.get("/pacientes/dpi/:dpi", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_pacientes WHERE dpi = $1", [req.params.dpi]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Paciente no encontrado." });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar paciente por DPI." });
  }
});

router.get("/pacientes/buscar", async (req, res) => {
  try {
    const { valor } = req.query;
    if (!valor) return res.status(400).json({ detail: "Debe especificar valor de búsqueda" });
    const query = `
      SELECT 
        pac.noafiliacion, pac.dpi, pac.nopacienteproveedor, pac.primernombre, pac.segundonombre, pac.otrosnombres, 
        pac.primerapellido, pac.segundoapellido, pac.apellidocasada, pac.edad, to_char(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento, 
        pac.sexo, pac.direccion, to_char(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso, dep.nombre AS departamento, 
        pac.estanciaprograma, estp.descripcion AS estado, acc.descripcion AS accesovascular, cau.descripcion AS causaegreso, 
        pac.numeroformulario, pac.periodoprestservicios, pac.sesionesautorizadasmes
      FROM tbl_pacientes pac
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_estadospaciente estp ON pac.idestado = estp.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
      WHERE pac.noafiliacion = $1
    `;
    const result = await pool.query(query, [valor]);
    if (result.rowCount === 0) return res.status(404).json({ detail: `No se encontró ningún paciente con número de afiliación: ${valor}` });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Registrar paciente (esquema public, snake_case)
router.post("/pacientes", async (req, res) => {
  const client = await pool.connect();
  const get = (...keys) => {
    for (const k of keys) {
      const v = req.body?.[k];
      if (v !== undefined && v !== null && `${v}`.trim() !== "") return v;
    }
    return null;
  };
  const toInt  = (v) => (v === null ? null : parseInt(v, 10));
  const toStr  = (v) => (v === null ? null : String(v).trim());
  const toDate = (v) => (v ? String(v) : null);

  try {
    const paciente = {
      no_afiliacion:            toInt(get("noAfiliacion", "no_afiliacion", "noafiliacion")),
      dpi:                      toStr(get("dpi", "DPI")),
      no_paciente_proveedor:    toInt(get("noPacienteProveedor", "no_paciente_proveedor", "nopacienteproveedor")),
      primer_nombre:            toStr(get("primerNombre", "primer_nombre", "primernombre")),
      segundo_nombre:           toStr(get("segundoNombre", "segundo_nombre", "segundonombre")),
      otros_nombres:            toStr(get("otrosNombres", "otros_nombres", "otrosnombres")),
      primer_apellido:          toStr(get("primerApellido", "primer_apellido", "primerapellido")),
      segundo_apellido:         toStr(get("segundoApellido", "segundo_apellido", "segundoapellido")),
      apellido_casada:          toStr(get("apellidoCasada", "apellido_casada", "apellidocasada")),
      fecha_nacimiento:         toDate(get("fechaNacimiento", "fecha_nacimiento")),
      sexo:                     toStr(get("sexo")),
      direccion:                toStr(get("direccion")),
      fecha_ingreso:            toDate(get("fechaIngreso", "fecha_ingreso", "fechaingreso")),
      id_departamento:          toInt(get("idDepartamento", "id_departamento", "iddepartamento")),
      id_acceso:                toInt(get("idAcceso", "id_acceso", "idacceso")),
      numero_formulario_activo: toStr(get("numeroFormulario", "numero_formulario_activo", "numeroformulario")),
      inicio_prest_servicios:   toDate(get("periodoInicio", "inicio_prest_servicios", "fechainicioperiodo")),
      fin_prest_servicios:      toDate(get("periodoFin", "fin_prest_servicios", "fechafinperiodo")),
      id_jornada:               toInt(get("idJornada", "id_jornada", "idjornada")),
      sesiones_autorizadas_mes: toInt(get("sesionesAutorizadasMes", "sesiones_autorizadas_mes", "sesionesautorizadasmes")),
      id_estado: 1,
      url_foto: null,
    };

    const requeridos = [
      ["no_afiliacion", "No. Afiliación"],
      ["dpi", "DPI"],
      ["no_paciente_proveedor", "No. Paciente Proveedor"],
      ["primer_nombre", "Primer Nombre"],
      ["primer_apellido", "Primer Apellido"],
      ["fecha_ingreso", "Fecha de Ingreso"],
      ["id_departamento", "Departamento"],
      ["id_acceso", "Acceso Vascular"],
      ["id_jornada", "Jornada"],
      ["sesiones_autorizadas_mes", "Sesiones Autorizadas Mes"],
      ["numero_formulario_activo", "Número de Formulario"],
    ];
    const faltantes = requeridos.filter(([k]) => !paciente[k] && paciente[k] !== 0).map(([, l]) => l);
    if (faltantes.length) return res.status(400).json({ success: false, error: `Faltan campos: ${faltantes.join(", ")}` });

    if (!/^\d{13}$/.test(paciente.dpi || "")) {
      return res.status(400).json({ success: false, error: "El DPI debe tener exactamente 13 caracteres" });
    }

    const base64Foto = get("photo", "foto");
    if (base64Foto) {
      const filename = await saveBase64Image(base64Foto, String(paciente.no_afiliacion));
      paciente.url_foto = filename;
    }

    await client.query("BEGIN");

    const yaExiste = await client.query("SELECT 1 FROM public.tbl_pacientes WHERE no_afiliacion = $1", [paciente.no_afiliacion]);
    if (yaExiste.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, error: "Ya existe un paciente con este número de afiliación." });
    }

    const sql = `
      INSERT INTO public.tbl_pacientes(
        no_afiliacion, dpi, no_paciente_proveedor,
        primer_nombre, segundo_nombre, otros_nombres,
        primer_apellido, segundo_apellido, apellido_casada,
        fecha_nacimiento, sexo, direccion,
        fecha_ingreso, id_departamento, id_estado,
        id_acceso, numero_formulario_activo,
        inicio_prest_servicios, fin_prest_servicios,
        url_foto, id_jornada, sesiones_autorizadas_mes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
      RETURNING no_afiliacion, url_foto
    `;

    const vals = [
      paciente.no_afiliacion, paciente.dpi, paciente.no_paciente_proveedor,
      paciente.primer_nombre, paciente.segundo_nombre, paciente.otros_nombres,
      paciente.primer_apellido, paciente.segundo_apellido, paciente.apellido_casada,
      paciente.fecha_nacimiento, paciente.sexo, paciente.direccion,
      paciente.fecha_ingreso, paciente.id_departamento, paciente.id_estado,
      paciente.id_acceso, paciente.numero_formulario_activo,
      paciente.inicio_prest_servicios, paciente.fin_prest_servicios,
      paciente.url_foto, paciente.id_jornada, paciente.sesiones_autorizadas_mes
    ];

    const ins = await client.query(sql, vals);
    await client.query("COMMIT");

    const noaf = ins.rows[0].no_afiliacion;
    const fotoUrl = ins.rows[0].url_foto ? `/fotos/${ins.rows[0].url_foto}` : null;

    return res.status(201).json({
      success: true,
      message: "Paciente registrado exitosamente.",
      no_afiliacion: noaf,
      fotoUrl,
      carnetUrl: `/carnet/forzar/${noaf}`
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[POST /pacientes] Error:", err);
    return res.status(500).json({ success: false, error: "Error interno al registrar paciente." });
  } finally {
    client.release();
  }
});

router.put("/pacientes/:noAfiliacion", async (req, res) => {
  const client = await pool.connect();
  try {
    const { noAfiliacion } = req.params;
    const {
      idcausa, causaegreso, fechaegreso, nocasoconcluido, comorbilidades,
      fechafallecimiento, lugarfallecimiento, causafallecimiento,
      desdeEgreso, desdeReingreso,
      primerNombre, segundoNombre, primerApellido, segundoApellido,
      numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo,
    } = req.body;

    await client.query("BEGIN");
    let result;
    if (desdeReingreso) {
      result = await client.query(
        `UPDATE public.tbl_pacientes SET 
            primer_nombre = $1, segundo_nombre = $2, primer_apellido = $3, segundo_apellido = $4,
            numero_formulario_activo = $5, sesiones_autorizadas_mes = $6,
            inicio_prest_servicios = $7::date, fin_prest_servicios = $8::date,
            id_estado = 2, id_causa = NULL, causa_egreso = NULL, fecha_egreso = NULL, no_caso_concluido = NULL
         WHERE no_afiliacion = $9 RETURNING *`,
        [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, noAfiliacion]
      );
    } else if (desdeEgreso) {
      result = await client.query(
        `UPDATE public.tbl_pacientes SET
            id_estado = 3, id_causa = $1, causa_egreso = $2, fecha_egreso = $3::date, no_caso_concluido = $4,
            comorbilidades = COALESCE($5, NULL), fecha_fallecimiento = COALESCE($6::date, NULL),
            lugar_fallecimiento = COALESCE($7, NULL), causa_fallecimiento = COALESCE($8, NULL)
         WHERE no_afiliacion = $9 RETURNING *`,
        [idcausa, causaegreso, fechaegreso, nocasoconcluido, comorbilidades, fechafallecimiento, lugarfallecimiento, causafallecimiento, noAfiliacion]
      );
    } else {
      result = await client.query(
        `UPDATE public.tbl_pacientes SET 
            primer_nombre = $1, segundo_nombre = $2, primer_apellido = $3, segundo_apellido = $4,
            numero_formulario_activo = $5, sesiones_autorizadas_mes = $6,
            inicio_prest_servicios = $7::date, fin_prest_servicios = $8::date
         WHERE no_afiliacion = $9 RETURNING *`,
        [primerNombre, segundoNombre, primerApellido, segundoApellido, numeroformulario, sesionesautorizadasmes, fechainicioperiodo, fechafinperiodo, noAfiliacion]
      );
    }

    if (result.rowCount === 0) return res.status(404).json({ detail: "Paciente no encontrado" });
    await client.query("COMMIT");
    res.json({ success: true, message: "Paciente actualizado exitosamente", paciente: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en PUT /pacientes/:noAfiliacion:", err.message, err.stack);
    res.status(500).json({ detail: err.message });
  } finally {
    client.release();
  }
});

router.get("/pacientes", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pac.no_afiliacion,
        pac.dpi,
        pac.no_paciente_proveedor,
        pac.primer_nombre,
        pac.segundo_nombre,
        pac.otros_nombres,
        pac.primer_apellido,
        pac.segundo_apellido,
        pac.apellido_casada,
        pac.edad,
        pac.fecha_nacimiento,
        pac.sexo,
        pac.direccion,
        pac.fecha_ingreso,
        dep.nombre AS departamento,
        est.descripcion AS estado,
        acc.descripcion AS acceso_vascular,
        pac.numero_formulario_activo,
        pac.inicio_prest_servicios,
        pac.fin_prest_servicios,
        pac.sesiones_autorizadas_mes
      FROM public.tbl_pacientes pac
        LEFT JOIN public.tbl_departamento     dep ON pac.id_departamento = dep.id_departamento
        LEFT JOIN public.tbl_estados_paciente est ON pac.id_estado       = est.id_estado
        LEFT JOIN public.tbl_acceso_vascular  acc ON pac.id_acceso       = acc.id_acceso
      ORDER BY pac.primer_nombre, pac.primer_apellido
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --------------------------------------------------
//  Turnos
// --------------------------------------------------
router.put("/abandonar-turno/:turno_id", async (req, res) => {
  try {
    const { turno_id } = req.params;
    await pool.query("UPDATE tbl_turnos SET idturnoestado = 5 WHERE idturno = $1", [turno_id]);
    res.json({ message: "Turno marcado como abandonado exitosamente" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.post("/crear-turno", async (req, res) => {
  const client = await pool.connect();
  try {
    const { noAfiliacion, clinica, fechaTurno } = req.body;
    await client.query("BEGIN");

    const idQuery = `
      WITH RECURSIVE numeros AS (
        SELECT 1 as num
        UNION ALL
        SELECT num + 1 FROM numeros WHERE num < (SELECT COALESCE(MAX(idturno),1) FROM tbl_turnos)
      )
      SELECT MIN(numeros.num) as siguiente_id
      FROM numeros
      LEFT JOIN tbl_turnos ON tbl_turnos.idturno = numeros.num
      WHERE tbl_turnos.idturno IS NULL;
    `;
    const idResult = await client.query(idQuery);
    let nuevoId = idResult.rows[0]?.siguiente_id;
    if (!nuevoId) {
      const maxIdResult = await client.query("SELECT COALESCE(MAX(idturno), 0) + 1 as nuevo_id FROM tbl_turnos");
      nuevoId = maxIdResult.rows[0].nuevo_id;
    }

    await client.query(
      `INSERT INTO tbl_turnos (idturno, noAfiliacion, idclinica, fechacreacion, fechaturno, idturnoestado)
       VALUES ($1, $2, (SELECT idsala FROM tbl_clinica WHERE descripcion = $3), $4, $5, 2)`,
      [nuevoId, noAfiliacion, clinica, fechaTurno, fechaTurno]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Turno creado exitosamente", turnoId: nuevoId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ detail: err.message });
  } finally {
    client.release();
  }
});

router.put("/llamar-turno/:turno_id", async (req, res) => {
  try {
    const { turno_id } = req.params;
    await pool.query("UPDATE tbl_turnos SET idturnoestado = 3 WHERE idturno = $1", [turno_id]);
    res.json({ success: true, message: "Turno llamado exitosamente" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put("/actualizar-turno/:turno_id", async (req, res) => {
  try {
    const { turno_id } = req.params;
    const { fechaTurno } = req.body;
    await pool.query("UPDATE tbl_turnos SET fechaturno = $1 WHERE idturno = $2", [fechaTurno, turno_id]);
    res.json({ success: true, message: "Turno actualizado exitosamente" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put("/finalizar-turno/:turno_id", async (req, res) => {
  try {
    const { turno_id } = req.params;
    await pool.query("UPDATE tbl_turnos SET idturnoestado = 4 WHERE idturno = $1", [turno_id]);
    res.json({ message: `Turno ${turno_id} finalizado manualmente` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.put("/asignar-turno/:turno_id", async (req, res) => {
  try {
    const { turno_id } = req.params;
    await pool.query("UPDATE tbl_turnos SET idturnoestado = 1, fechaasignacion=now() WHERE idturno = $1", [turno_id]);
    res.json({ success: true, message: "Turno asignado exitosamente" });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get("/clinicas", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_clinica");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get("/turnos-siguientes", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.noAfiliacion,
        p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') as nombrepaciente,
        c.descripcion AS nombreclinica,
        t.FechaTurno,
        COALESCE(p.url_foto, p.urlfoto) as urlfoto
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
      WHERE t.idturnoestado = 1
      ORDER BY t.FechaTurno ASC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get("/reporte-turnos-pdf", async (req, res) => {
  try {
    const { numeroafiliacion, fecha, clinica } = req.query;
    let filtros = [];
    let valores = [];
    let idx = 1;
    if (numeroafiliacion) { filtros.push(`t.noAfiliacion = $${idx++}`); valores.push(numeroafiliacion); }
    if (fecha) { filtros.push(`DATE(t.FechaTurno) = $${idx++}`); valores.push(fecha); }
    if (clinica) { filtros.push(`c.descripcion ILIKE $${idx++}`); valores.push(`%${clinica}%`); }
    const where = filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";
    const consulta = `
      SELECT 
        t.idTurno, t.noAfiliacion AS numeroafiliacion,
        p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
        to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
        to_char(t.FechaTurno, 'HH24:MI') AS hora,
        c.descripcion AS nombreclinica,
        e.descripcion AS estado
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
        INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
      ${where}
      ORDER BY t.FechaTurno DESC
    `;
    const result = await pool.query(consulta, valores);

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="reporte_turnos.pdf"');
    doc.pipe(res);

    const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
    let topY = doc.y;
    if (fs.existsSync(logoPath)) {
      const pageWidth = doc.page.width;
      const logoWidth = 100;
      const xLogo = (pageWidth - logoWidth) / 2;
      doc.image(logoPath, xLogo, topY, { width: logoWidth });
      topY += 50;
    }
    doc.y = topY + 10;
    doc.fontSize(18).text("Reporte de Turnos", 0, doc.y, { align: "center" });
    doc.moveDown(0.5);

    const totalRegistros = result.rows.length;
    let fechas = result.rows.map((r) => r.fecha).filter(Boolean).sort();
    let rangoTexto = fechas.length
      ? fechas[0] === fechas[fechas.length - 1]
        ? `Fecha: ${fechas[0]}`
        : `Rango de fechas: ${fechas[0]} a ${fechas[fechas.length - 1]}`
      : "Sin registros de fecha";
    doc.fontSize(11).font("Helvetica").text(`Total de registros: ${totalRegistros}`, { align: "center" });
    doc.fontSize(11).font("Helvetica").text(rangoTexto, { align: "center" });
    doc.moveDown(1.2);

    doc.fontSize(12).font("Helvetica-Bold");
    const headers = ["AFILIACIÓN", "PACIENTE", "FECHA", "CLÍNICA", "ESTADO"];
    const margin = 30;
    const usableWidth = doc.page.width - margin * 2;
    const colPercents = [0.16, 0.33, 0.16, 0.22, 0.13];
    const colWidths = colPercents.map((p) => Math.floor(usableWidth * p));
    let y = doc.y;
    let x = margin;

    doc.rect(margin, y - 2, usableWidth, 18).fillAndStroke("#e4e4e4", "#000");
    doc.fillColor("#000");
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: colWidths[i], align: "center", continued: i < headers.length - 1 });
      x += colWidths[i];
    });
    doc.font("Helvetica");
    doc.moveDown(0.5);
    doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).strokeColor("#bbb").stroke();

    const colPositions = [margin];
    for (let i = 0; i < colWidths.length; i++) colPositions.push(colPositions[i] + colWidths[i]);

    result.rows.forEach((row) => {
      let x = margin;
      y = doc.y + 2;
      doc.font("Helvetica").fontSize(10);
      doc.text(row.numeroafiliacion, x, y, { width: colWidths[0], continued: true, lineBreak: false });
      x += colWidths[0];

      let nombrePaciente = row.nombrepaciente || "";
      let partes = nombrePaciente.trim().split(/\s+/);
      let nombreReducido = partes[0] || "";
      if (partes.length > 1) nombreReducido += " " + partes[1];
      let maxWidth = colWidths[1];
      let fontSize = 10;
      doc.font("Helvetica").fontSize(fontSize);
      while (doc.widthOfString(nombreReducido) > maxWidth && nombreReducido.length > 0) nombreReducido = nombreReducido.slice(0, -1);
      if (nombreReducido !== partes[0] + (partes[1] ? " " + partes[1] : "")) {
        nombreReducido = nombreReducido.length > 3 ? nombreReducido.slice(0, -3) + "..." : nombreReducido + "...";
      }
      doc.text(nombreReducido, x, y, { width: colWidths[1], continued: true, lineBreak: false });
      x += colWidths[1];
      doc.text(row.fecha, x, y, { width: colWidths[2], continued: true, lineBreak: false });
      x += colWidths[2];
      doc.text(row.nombreclinica, x, y, { width: colWidths[3], continued: true, lineBreak: false });
      x += colWidths[3];
      doc.text(row.estado, x, y, { width: colWidths[4], continued: false, lineBreak: false });

      doc.moveTo(margin, doc.y + 14).lineTo(doc.page.width - margin, doc.y + 14).strokeColor("#bbb").stroke();
      colPositions.forEach((xPos) => {
        doc.moveTo(xPos, y).lineTo(xPos, y + 16).strokeColor("#bbb").stroke();
      });
      doc.y = y + 16;
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reporte-turnos", async (req, res) => {
  try {
    const { numeroafiliacion, fecha, clinica } = req.query;
    let filtros = []; let valores = []; let idx = 1;
    if (numeroafiliacion) { filtros.push(`t.noAfiliacion = $${idx++}`); valores.push(numeroafiliacion); }
    if (fecha) { filtros.push(`DATE(t.FechaTurno) = $${idx++}`); valores.push(fecha); }
    if (clinica) { filtros.push(`c.descripcion ILIKE $${idx++}`); valores.push(`%${clinica}%`); }
    const where = filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";
    const consulta = `
      SELECT 
        t.idTurno, t.noAfiliacion AS numeroafiliacion,
        p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
        to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
        to_char(t.FechaTurno, 'HH24:MI') AS hora,
        c.descripcion AS nombreclinica,
        e.descripcion AS estado
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
        INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
      ${where}
      ORDER BY t.FechaTurno DESC
    `;
    const result = await pool.query(consulta, valores);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Turnos");
    worksheet.columns = [
      { header: "Afiliación", key: "numeroafiliacion", width: 15 },
      { header: "Paciente", key: "nombrepaciente", width: 30 },
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Hora", key: "hora", width: 10 },
      { header: "Clínica", key: "nombreclinica", width: 20 },
      { header: "Estado", key: "estado", width: 15 },
    ];
    worksheet.addRows(result.rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="reporte_turnos.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/turnos", async (req, res) => {
  try {
    const { numeroafiliacion, fecha, clinica } = req.query;
    let filtros = []; let valores = []; let idx = 1;
    if (numeroafiliacion) { filtros.push(`t.noAfiliacion = $${idx++}`); valores.push(numeroafiliacion); }
    if (fecha) { filtros.push(`DATE(t.FechaTurno) = $${idx++}`); valores.push(fecha); }
    if (clinica) { filtros.push(`c.descripcion ILIKE $${idx++}`); valores.push(`%${clinica}%`); }
    const where = filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";
    const consulta = `
      SELECT 
        t.idTurno, t.noAfiliacion AS numeroafiliacion,
        p.primernombre || ' ' || COALESCE(p.segundonombre,'') || ' ' || p.primerapellido || ' ' || COALESCE(p.segundoapellido,'') AS nombrepaciente,
        to_char(t.FechaTurno, 'YYYY-MM-DD') AS fecha,
        to_char(t.FechaTurno, 'HH24:MI') AS hora,
        c.descripcion AS nombreclinica,
        e.descripcion AS estado
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
        INNER JOIN tbl_turnoestados e ON t.idturnoestado = e.idturnoestado
      ${where}
      ORDER BY t.FechaTurno DESC
    `;
    const result = await pool.query(consulta, valores);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/turno-mas-antiguo/:clinica", async (req, res) => {
  try {
    const { clinica } = req.params;
    const consulta = `
      SELECT 
        t.idTurno, t.noAfiliacion, p.primernombre || ' ' || p.segundonombre || ' ' || p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
        c.descripcion AS nombreclinica, t.FechaTurno, t.FechaAsignacion, COALESCE(p.url_foto, p.urlfoto) as urlfoto
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
      WHERE c.descripcion = $1 AND t.idturnoestado = 3
      ORDER BY t.FechaAsignacion ASC
      LIMIT 1
    `;
    const result = await pool.query(consulta, [clinica]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.get("/turno-mas-antiguo-asignado/:clinica", async (req, res) => {
  try {
    const { clinica } = req.params;
    const consulta = `
      SELECT 
        t.idTurno, t.noAfiliacion, p.primernombre || ' ' || p.segundonombre || ' ' || p.primerapellido || ' ' || p.segundoapellido AS nombrepaciente,
        c.descripcion AS nombreclinica, t.FechaTurno, t.FechaAsignacion, COALESCE(p.url_foto, p.urlfoto) as urlfoto
      FROM tbl_Turnos t
        INNER JOIN tbl_pacientes p ON t.noAfiliacion = p.noAfiliacion
        INNER JOIN tbl_clinica c ON t.idclinica = c.idsala
      WHERE c.descripcion = $1 AND t.idturnoestado = 1
      ORDER BY t.FechaAsignacion ASC
      LIMIT 1
    `;
    const result = await pool.query(consulta, [clinica]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete("/eliminar-turno/:idturno", async (req, res) => {
  const { idturno } = req.params;
  try {
    const result = await pool.query("DELETE FROM tbl_turnos WHERE idturno = $1", [idturno]);
    if (result.rowCount > 0) res.json({ success: true, message: "Turno eliminado correctamente." });
    else res.status(404).json({ success: false, message: "Turno no encontrado." });
  } catch (error) {
    console.error("Error al eliminar turno:", error);
    res.status(500).json({ success: false, message: "Error al eliminar turno.", detalle: error.message });
  }
});

router.post("/registrar-faltista", async (req, res) => {
  const { noafiliacion, fechaFalta, motivoFalta } = req.body;
  if (!noafiliacion || !fechaFalta || !motivoFalta) {
    return res.status(400).json({ success: false, message: "Faltan datos requeridos." });
  }
  try {
    await pool.query(
      "INSERT INTO tbl_faltistas (noafiliacion, fechaFalta, motivoFalta) VALUES ($1, $2, $3)",
      [noafiliacion, fechaFalta, motivoFalta]
    );
    res.json({ success: true, message: "Faltista registrado correctamente." });
  } catch (error) {
    console.error("Error al registrar faltista:", error);
    res.status(500).json({ success: false, message: "Error al registrar faltista.", detalle: error.message });
  }
});

// --------------------------------------------------
//  Reportes Excel/PDF de pacientes
// --------------------------------------------------
router.get("/api/reportes/egreso/excel", async (req, res) => {
  try {
    const { fechainicio, fechafin } = req.query;
    let baseQuery = `
      SELECT 
        pac.noafiliacion as noafiliacion,
        pac.dpi as dpi,
        pac.nopacienteproveedor as nointernoproveedor,
        CONCAT_WS(' ', pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada) as nombrecompleto,
        TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
        pac.sexo as sexo,
        pac.direccion as direccion,
        dep.nombre as departamento,
        TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
        est.descripcion as estadopaciente,
        jor.descripcion as jornada,
        acc.descripcion as accesovascular,
        pac.nocasoconcluido as nocasoconcluido,
        pac.numeroformulario as numeroformulario,
        TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
        TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
        pac.sesionesautorizadasmes as numerosesionesautorizadasmes,
        pac.sesionesrealizadasmes as numerosesionesrealizadasmes,
        pac.fechanacimiento as fechanacimiento_raw,
        pac.idcausa as idcausa,
        cau.descripcion as causaegreso,
        TO_CHAR(pac.fechaegreso,'YYYY-MM-DD') as fechaegreso
      FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
        LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
      WHERE est.descripcion = 'Egreso'
    `;
    const params = [];
    let idx = 1;
    if (fechainicio) { baseQuery += ` AND pac.fechainicioperiodo >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { baseQuery += ` AND pac.fechainicioperiodo <= $${idx++}`; params.push(fechafin); }
    baseQuery += " ORDER BY pac.fechainicioperiodo DESC LIMIT 100";

    const result = await pool.query(baseQuery, params);

    const pacientes = result.rows.map((p) => {
      let edad = "";
      if (p.fechanacimiento_raw) {
        const fechaNac = new Date(p.fechanacimiento_raw);
        const hoy = new Date();
        let anios = hoy.getFullYear() - fechaNac.getFullYear();
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) anios--;
        edad = anios;
      }
      let periodo = "";
      if (p.fechainicioperiodo && p.fechafinperiodo) periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;

      return {
        noafiliacion: p.noafiliacion,
        dpi: p.dpi,
        nointernoproveedor: p.nointernoproveedor,
        nombrecompleto: p.nombrecompleto,
        fechanacimiento: p.fechanacimiento,
        edad: edad,
        sexo: p.sexo,
        direccion: p.direccion,
        departamento: p.departamento,
        fechaingreso: p.fechaingreso,
        estadopaciente: p.estadopaciente,
        jornada: p.jornada,
        accesovascular: p.accesovascular,
        numerosesionesautorizadasmes: p.numerosesionesautorizadasmes,
        numerosesionesrealizadasmes: p.numerosesionesrealizadasmes,
        numerosesionesnorealizadasmes: Number(p.numerosesionesautorizadasmes || 0) - Number(p.numerosesionesrealizadasmes || 0),
        causaegreso: p.causaegreso,
        fechaegreso: p.fechaegreso,
        nocasoconcluido: p.nocasoconcluido,
        periodo,
        numeroformulario: p.numeroformulario,
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pacientes Egreso");
    const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
    if (fs.existsSync(logoPath)) {
      const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
      worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 7 } });
    }
    worksheet.mergeCells("D3:P5");
    worksheet.getCell("D3").value = "REPORTE PACIENTES EGRESO";
    worksheet.getCell("D3").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("D3").font = { name: "Arial", size: 28, bold: true, color: { argb: "FF16a085" } };

    worksheet.columns = [
      { header: "No. Afiliación", key: "noafiliacion", width: 15 },
      { header: "DPI", key: "dpi", width: 15 },
      { header: "No. Interno Proveedor", key: "nointernoproveedor", width: 20 },
      { header: "Nombre Completo", key: "nombrecompleto", width: 30 },
      { header: "Fecha de Nacimiento", key: "fechanacimiento", width: 15 },
      { header: "Edad", key: "edad", width: 10 },
      { header: "Sexo", key: "sexo", width: 10 },
      { header: "Dirección", key: "direccion", width: 30 },
      { header: "Departamento", key: "departamento", width: 20 },
      { header: "Fecha Ingreso", key: "fechaingreso", width: 15 },
      { header: "Estado del Paciente", key: "estadopaciente", width: 20 },
      { header: "Causa de Egreso", key: "causaegreso", width: 20 },
      { header: "Fecha de Egreso", key: "fechaegreso", width: 15 },
      { header: "No Caso Concluido", key: "nocasoconcluido", width: 20 },
      { header: "Jornada", key: "jornada", width: 15 },
      { header: "Acceso Vascular", key: "accesovascular", width: 20 },
      { header: "Número de Formulario", key: "numeroformulario", width: 20 },
      { header: "Periodo", key: "periodo", width: 20 },
      { header: "Sesiones Autorizadas Mes", key: "numerosesionesautorizadasmes", width: 20 },
      { header: "Sesiones Realizadas Mes", key: "numerosesionesrealizadasmes", width: 20 },
      { header: "Sesiones No Realizadas Mes", key: "numerosesionesnorealizadasmes", width: 20 },
    ];

    const startRow = 8;
    worksheet.getRow(startRow).values = worksheet.columns.map((c) => c.header);
    pacientes.forEach((p, i) => {
      const rowIdx = startRow + 1 + i;
      worksheet.getRow(rowIdx).values = worksheet.columns.map((c) => p[c.key] ?? "");
    });

    worksheet.addTable({
      name: "PacientesEgresoTable",
      ref: `A${startRow}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium13", showRowStripes: true },
      columns: worksheet.columns.map((c) => ({ name: c.header, filterButton: true })),
      rows: pacientes.map((p) => worksheet.columns.map((c) => p[c.key] ?? "")),
    });

    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="reporte_egreso.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Hubo un error al generar el reporte de egreso." });
  }
});

router.get("/api/reportes/nuevoingreso/excel", async (req, res) => {
  try {
    const { fechainicio, fechafin } = req.query;
    let baseQuery = `
      SELECT 
        pac.noafiliacion as noafiliacion,
        pac.dpi as dpi,
        pac.nopacienteproveedor as nointernoproveedor,
        CONCAT_WS(' ', pac.primernombre, pac.segundonombre, pac.otrosnombres, pac.primerapellido, pac.segundoapellido, pac.apellidocasada) as nombrecompleto,
        TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
        pac.sexo as sexo,
        pac.direccion as direccion,
        dep.nombre as departamento,
        TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
        est.descripcion as estadopaciente,
        jor.descripcion as jornada,
        acc.descripcion as accesovascular,
        pac.numeroformulario as numeroformulario,
        TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
        TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
        pac.sesionesautorizadasmes as numerosesionesautorizadasmes,
        pac.sesionesrealizadasmes as numerosesionesrealizadasmes,
        pac.fechanacimiento as fechanacimiento_raw
      FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
      WHERE est.descripcion = 'Nuevo Ingreso'
    `;
    const params = [];
    let idx = 1;
    if (fechainicio) { baseQuery += ` AND pac.fechainicioperiodo >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { baseQuery += ` AND pac.fechainicioperiodo <= $${idx++}`; params.push(fechafin); }
    baseQuery += " ORDER BY pac.fechainicioperiodo DESC LIMIT 100";

    const result = await pool.query(baseQuery, params);
    const pacientes = result.rows.map((p) => {
      let edad = "";
      if (p.fechanacimiento_raw) {
        const fechaNac = new Date(p.fechanacimiento_raw);
        const hoy = new Date();
        let anios = hoy.getFullYear() - fechaNac.getFullYear();
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) anios--;
        edad = anios;
      }
      let periodo = "";
      if (p.fechainicioperiodo && p.fechafinperiodo) periodo = `${p.fechainicioperiodo} al ${p.fechafinperiodo}`;

      return {
        noafiliacion: p.noafiliacion,
        dpi: p.dpi,
        nointernoproveedor: p.nointernoproveedor,
        nombrecompleto: p.nombrecompleto,
        edad,
        fechanacimiento: p.fechanacimiento,
        sexo: p.sexo,
        direccion: p.direccion,
        departamento: p.departamento,
        fechaingreso: p.fechaingreso,
        estadopaciente: p.estadopaciente,
        jornada: p.jornada,
        accesovascular: p.accesovascular,
        numeroformulario: p.numeroformulario,
        periodo,
        numerosesionesautorizadasmes: p.numerosesionesautorizadasmes,
        numerosesionesrealizadasmes: p.numerosesionesrealizadasmes,
        numerosesionesnorealizadasmes: Number(p.numerosesionesautorizadasmes || 0) - Number(p.numerosesionesrealizadasmes || 0),
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pacientes");
    const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
    if (fs.existsSync(logoPath)) {
      const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
      worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 7 } });
    }
    worksheet.mergeCells("C1:Q7");
    worksheet.getCell("C1").value = "REPORTE PACIENTES NUEVO INGRESO";
    worksheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getCell("C1").font = { name: "Arial", size: 26, bold: true };

    const startRow = 8;
    worksheet.columns = [
      { header: "No. Afiliación", key: "noafiliacion", width: 15 },
      { header: "DPI", key: "dpi", width: 18 },
      { header: "Número Proveedor", key: "nointernoproveedor", width: 18 },
      { header: "Nombre Completo", key: "nombrecompleto", width: 32 },
      { header: "Edad", key: "edad", width: 8 },
      { header: "Fecha de Nacimiento", key: "fechanacimiento", width: 15 },
      { header: "Sexo", key: "sexo", width: 10 },
      { header: "Dirección", key: "direccion", width: 28 },
      { header: "Departamento", key: "departamento", width: 18 },
      { header: "Fecha Ingreso", key: "fechaingreso", width: 15 },
      { header: "Estado del Paciente", key: "estadopaciente", width: 18 },
      { header: "Jornada", key: "jornada", width: 15 },
      { header: "Acceso Vascular", key: "accesovascular", width: 18 },
      { header: "Número de Formulario", key: "numeroformulario", width: 20 },
      { header: "Periodo", key: "periodo", width: 25 },
      { header: "Sesiones Autorizadas Mes", key: "numerosesionesautorizadasmes", width: 20 },
      { header: "Sesiones Realizadas Mes", key: "numerosesionesrealizadasmes", width: 20 },
      { header: "Sesiones No Realizadas Mes", key: "numerosesionesnorealizadasmes", width: 22 },
    ];

    worksheet.getRow(startRow).values = worksheet.columns.map((c) => c.header);
    pacientes.forEach((p, i) => {
      const rowIdx = startRow + 1 + i;
      worksheet.getRow(rowIdx).values = worksheet.columns.map((c) => p[c.key] ?? "");
    });

    worksheet.addTable({
      name: "PacientesNuevoIngresoTable",
      ref: `A${startRow}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium9", showRowStripes: true },
      columns: worksheet.columns.map((c) => ({ name: c.header, filterButton: true })),
      rows: pacientes.map((p) => worksheet.columns.map((c) => p[c.key] ?? "")),
    });

    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="reporte_nuevo_ingreso.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Error al exportar Excel.", detalle: error.message });
  }
});

router.get("/api/pacientes/excel", async (req, res) => {
  try {
    const { fechainicio, fechafin, estado, numeroformulario } = req.query;
    let baseQuery = `
      SELECT 
        pac.noafiliacion, pac.dpi, pac.nopacienteproveedor,
        pac.primernombre, pac.segundonombre, pac.otrosnombres,
        pac.primerapellido, pac.segundoapellido, pac.apellidocasada,
        TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
        pac.sexo, pac.direccion, dep.nombre as departamento,
        TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
        est.descripcion as estado, jor.descripcion as jornada,
        acc.descripcion as accesovascular, pac.numeroformulario,
        TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
        TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
        pac.sesionesautorizadasmes, pac.sesionesrealizadasmes,
        pac.fechanacimiento as fechanacimiento_raw,
        pac.idcausa, pac.causaegreso, cau.descripcion as causaegreso_descripcion,
        To_Char(pac.fechaegreso, 'YYYY-MM-DD') as fechaegreso
      FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
        LEFT JOIN tbl_causaegreso cau ON pac.idcausa = cau.idcausa
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (fechainicio) { baseQuery += ` AND pac.fechainicioperiodo >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { baseQuery += ` AND pac.fechainicioperiodo <= $${idx++}`; params.push(fechafin); }
    if (estado) { baseQuery += ` AND est.descripcion = $${idx++}`; params.push(estado); }
    if (numeroformulario) { baseQuery += ` AND pac.numeroformulario ILIKE $${idx++}`; params.push(`%${numeroformulario}%`); }
    baseQuery += " ORDER BY pac.fechainicioperiodo DESC LIMIT 100";

    const result = await pool.query(baseQuery, params);
    const pacientes = result.rows.map((p) => {
      let edad = "";
      if (p.fechanacimiento_raw) {
        const fechaNac = new Date(p.fechanacimiento_raw);
        const hoy = new Date();
        let anios = hoy.getFullYear() - fechaNac.getFullYear();
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) anios--;
        edad = anios;
      }
      const periodo = p.fechainicioperiodo && p.fechafinperiodo
        ? `Del ${p.fechainicioperiodo.split("-").reverse().join("/")} al ${p.fechafinperiodo.split("-").reverse().join("/")}`
        : "";
      return {
        noafiliacion: p.noafiliacion,
        dpi: p.dpi,
        nopacienteproveedor: p.nopacienteproveedor,
        nombre: [p.primernombre, p.segundonombre, p.otrosnombres, p.primerapellido, p.segundoapellido, p.apellidocasada]
          .filter(Boolean).join(" ").replace(/ +/g, " ").trim(),
        fechanacimiento: p.fechanacimiento,
        edad, sexo: p.sexo, direccion: p.direccion, departamento: p.departamento,
        fechaingreso: p.fechaingreso, estadopaciente: p.estado, jornada: p.jornada,
        accesovascular: p.accesovascular, numeroformulario: p.numeroformulario,
        periodo, sesionesautorizadasmes: p.sesionesautorizadasmes, sesionesrealizadasmes: p.sesionesrealizadasmes,
        sesionesnorealizadasmes: Number(p.sesionesautorizadasmes || 0) - Number(p.sesionesrealizadasmes || 0),
        causaegreso: p.causaegreso, fechaegreso: p.fechaegreso,
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pacientes");
    const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
    if (fs.existsSync(logoPath)) {
      const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
      worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 7 } });
    }

    worksheet.mergeCells("D3:P5");
    worksheet.getCell("D3").value = "REPORTE GENERAL DE PACIENTES";
    worksheet.getCell("D3").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    worksheet.getCell("D3").font = { name: "Arial", size: 28, bold: true };

    worksheet.columns = [
      { header: "No. Afiliación", key: "noafiliacion", width: 15 },
      { header: "DPI", key: "dpi", width: 18 },
      { header: "Número Proveedor", key: "nopacienteproveedor", width: 18 },
      { header: "Nombre Completo", key: "nombre", width: 32 },
      { header: "Fecha de Nacimiento", key: "fechanacimiento", width: 15 },
      { header: "Edad", key: "edad", width: 8 },
      { header: "Sexo", key: "sexo", width: 10 },
      { header: "Dirección", key: "direccion", width: 28 },
      { header: "Departamento", key: "departamento", width: 18 },
      { header: "Fecha Ingreso", key: "fechaingreso", width: 15 },
      { header: "Estado del Paciente", key: "estadopaciente", width: 18 },
      { header: "Jornada", key: "jornada", width: 15 },
      { header: "Acceso Vascular", key: "accesovascular", width: 18 },
      { header: "Número de Formulario", key: "numeroformulario", width: 20 },
      { header: "Periodo", key: "periodo", width: 25 },
      { header: "Sesiones Autorizadas Mes", key: "sesionesautorizadasmes", width: 20 },
      { header: "Sesiones Realizadas Mes", key: "sesionesrealizadasmes", width: 20 },
      { header: "Sesiones No Realizadas Mes", key: "sesionesnorealizadasmes", width: 22 },
      { header: "Causa de Egreso", key: "causaegreso", width: 25 },
      { header: "Fecha de Egreso", key: "fechaegreso", width: 15 },
    ];

    const startRow = 8;
    worksheet.getRow(startRow).values = worksheet.columns.map((c) => c.header);
    pacientes.forEach((p, i) => {
      const rowIdx = startRow + 1 + i;
      worksheet.getRow(rowIdx).values = worksheet.columns.map((c) => p[c.key] ?? "");
    });

    worksheet.addTable({
      name: "PacientesTable",
      ref: `A${startRow}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium11", showRowStripes: true },
      columns: worksheet.columns.map((c) => ({ name: c.header, filterButton: true })),
      rows: pacientes.map((p) => worksheet.columns.map((c) => p[c.key] ?? "")),
    });

    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="reporte_pacientes.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Error al exportar Excel.", detalle: error.message });
  }
});

router.get("/api/pacientes/pdf", async (req, res) => {
  try {
    const { fechainicio, fechafin, estado, numeroformulario } = req.query;
    let baseQuery = `
      SELECT 
        pac.noafiliacion as noafiliacion,
        pac.dpi as dpi,
        pac.nopacienteproveedor as nopacienteproveedor,
        pac.primernombre as primernombre,
        pac.segundonombre as segundonombre,
        pac.otrosnombres as otrosnombres,
        pac.primerapellido as primerapellido,
        pac.segundoapellido as segundoapellido,
        pac.apellidocasada as apellidocasada,
        TO_CHAR(pac.fechanacimiento, 'YYYY-MM-DD') as fechanacimiento,
        pac.sexo as sexo,
        pac.direccion as direccion,
        dep.nombre as departamento,
        TO_CHAR(pac.fechaingreso, 'YYYY-MM-DD') as fechaingreso,
        est.descripcion as estado,
        jor.descripcion as jornada,
        acc.descripcion as accesovascular,
        pac.numeroformulario as numeroformulario,
        TO_CHAR(pac.fechainicioperiodo, 'YYYY-MM-DD') as fechainicioperiodo,
        TO_CHAR(pac.fechafinperiodo, 'YYYY-MM-DD') as fechafinperiodo,
        pac.sesionesautorizadasmes as sesionesautorizadasmes,
        pac.sesionesrealizadasmes as sesionesrealizadasmes,
        pac.fechanacimiento as fechanacimiento_raw
      FROM tbl_pacientes pac
        LEFT JOIN tbl_estadospaciente est ON pac.idestado = est.idestado
        LEFT JOIN tbl_accesovascular acc ON pac.idacceso = acc.idacceso
        LEFT JOIN tbl_departamentos dep ON pac.iddepartamento = dep.iddepartamento
        LEFT JOIN tbl_jornadas jor ON pac.idjornada = jor.idjornada
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;
    if (fechainicio) { baseQuery += ` AND pac.fechainicioperiodo >= $${idx++}`; params.push(fechainicio); }
    if (fechafin) { baseQuery += ` AND pac.fechainicioperiodo <= $${idx++}`; params.push(fechafin); }
    if (estado) { baseQuery += ` AND est.descripcion = $${idx++}`; params.push(estado); }
    if (numeroformulario) { baseQuery += ` AND pac.numeroformulario ILIKE $${idx++}`; params.push(`%${numeroformulario}%`); }
    baseQuery += " ORDER BY pac.fechainicioperiodo DESC LIMIT 100";

    const result = await pool.query(baseQuery, params);

    const pacientes = result.rows.map((p) => {
      let edad = "";
      if (p.fechanacimiento_raw) {
        const fechaNac = new Date(p.fechanacimiento_raw);
        const hoy = new Date();
        let anios = hoy.getFullYear() - fechaNac.getFullYear();
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) anios--;
        edad = anios;
      }
      let periodo = "";
      if (p.fechainicioperiodo && p.fechafinperiodo) {
        periodo = `Del ${p.fechainicioperiodo.split("-").reverse().join("/")} al ${p.fechafinperiodo.split("-").reverse().join("/")}`;
      }
      return {
        NoAfiliacion: p.noafiliacion,
        DPI: p.dpi,
        NoInternoProveedor: p.nopacienteproveedor,
        NombreCompleto: [p.primernombre, p.segundonombre, p.otrosnombres, p.primerapellido, p.segundoapellido, p.apellidocasada]
          .filter(Boolean).join(" ").replace(/ +/g, " ").trim(),
        FechaNacimiento: p.fechanacimiento,
        Edad: edad, Sexo: p.sexo, Direccion: p.direccion, Departamento: p.departamento,
        FechaIngreso: p.fechaingreso, EstadoPaciente: p.estado, Jornada: p.jornada,
        AccesoVascular: p.accesovascular, NumeroFormulario: p.numeroformulario, Periodo: periodo,
        NumeroSesionesAutorizadasMes: p.sesionesautorizadasmes, NumeroSesionesRealizadasMes: p.sesionesrealizadasmes,
      };
    });

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="reporte_pacientes.pdf"');
    doc.pipe(res);

    const logoPath = path.join(__dirname, "assets", "img", "logoClinica.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width / 2 - 40, 20, { width: 80, height: 80, align: "center" });
    }
    const azul = "#003366", verde = "#2ecc71", blanco = "#FFFFFF", grisClaro = "#F2F2F2";

    doc.moveDown(5);
    doc.font("Helvetica-Bold").fontSize(24).fillColor(azul).text("Reporte de Pacientes", { align: "center" });
    doc.moveDown(0.5);
    doc.lineWidth(4).strokeColor(verde).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1.5);

    const tableTop = doc.y + 10;
    const colWidths = [60, 90, 120, 120, 65, 40, 35, 100, 60, 60, 70, 60, 80, 70, 90, 60, 60];
    const headers = [
      "No. Afiliación","DPI","No. Interno Proveedor","Nombres y Apellidos","Fecha Nacimiento","Edad","Sexo","Dirección",
      "Departamento","Fecha Ingreso","Estado Paciente","Jornada","Acceso Vascular","Número Formulario","Periodo",
      "Sesiones Autorizadas Mes","Sesiones Realizadas Mes",
    ];

    let x = 50, y = tableTop;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.fillColor(blanco).rect(x, y, colWidths.reduce((a, b) => a + b, 0), 28).fill(azul);
    let colX = x;
    headers.forEach((h, i) => {
      doc.fillColor(blanco).text(h, colX + 4, y + 8, { width: colWidths[i] - 8, align: "left" });
      colX += colWidths[i];
    });
    y += 28;
    doc.font("Helvetica").fontSize(8);
    pacientes.forEach((p, idx) => {
      const fill = idx % 2 === 0 ? grisClaro : blanco;
      doc.fillColor(fill).rect(x, y, colWidths.reduce((a, b) => a + b, 0), 20).fill();
      let colX = x;
      [
        p.NoAfiliacion,p.DPI,p.NoInternoProveedor,p.NombreCompleto,p.FechaNacimiento,p.Edad,p.Sexo,p.Direccion,
        p.Departamento,p.FechaIngreso,p.EstadoPaciente,p.Jornada,p.AccesoVascular,p.NumeroFormulario,p.Periodo,
        p.NumeroSesionesAutorizadasMes,p.NumeroSesionesRealizadasMes,
      ].forEach((val, i) => {
        doc.fillColor(azul).text(val != null ? String(val) : "", colX + 4, y + 4, { width: colWidths[i] - 8, align: "left" });
        colX += colWidths[i];
      });
      y += 20;
    });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: "Error al exportar PDF.", detalle: error.message });
  }
});

module.exports = router;
