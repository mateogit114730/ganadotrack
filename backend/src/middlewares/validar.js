// Valida body, params y query con esquemas Zod antes de llegar al controlador.
// Los datos ya validados y convertidos quedan en req.body, req.datosParams y req.datosQuery.
export function validar({ body, params, query } = {}) {
  return (req, res, next) => {
    if (body) req.body = body.parse(req.body ?? {});
    if (params) req.datosParams = params.parse(req.params);
    if (query) req.datosQuery = query.parse(req.query);
    next();
  };
}
