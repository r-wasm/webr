/*
 * R graphics device targeting the HTML canvas element
 * Description: R graphics device that generates HTML canvas API calls and
 *              transmits them to the main webR thread for plotting.
 * Author: George Stagg, based on the canvas package created by Jeffrey Horner.
 * License: GPL version 2
 */
#include <stdio.h>
#include <ctype.h>

#include <R.h>
#include <Rversion.h>
#include <Rinternals.h>
#include <R_ext/Rdynload.h>
#include <R_ext/GraphicsEngine.h>
#include <R_ext/GraphicsDevice.h>

#if R_VERSION >= R_Version(2,8,0)
#ifndef NewDevDesc
#define NewDevDesc DevDesc
#endif
#endif

#define CREDC(C) (((unsigned int)(C))&0xff)
#define CGREENC(C) ((((unsigned int)(C))&0xff00)>>8)
#define CBLUEC(C) ((((unsigned int)(C))&0xff0000)>>16)
#define CALPHA(C) ((((unsigned int)(C))&0xff000000)>>24)

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

/* Interact with the HTML canvas 2D context API by building Javascript
 * commands and running them with emscripten_run_script().
 * We avoid using EM_ASM and friends because this code will be compiled
 * in an emscripten SIDE_MODULE, where they do not work at time of writing.
 */
#define canvasExecBufferMax 8192
#define _E(op) "chan.write({ type: 'canvasExec', data: `" op "` });"

#define canvasContextRender(cGD, op, ...) {                                          \
    const char template[] = _E op;                                                   \
    int ret = snprintf(cGD->buffer, canvasExecBufferMax, template, ##  __VA_ARGS__); \
    if (ret < 0 || ret >= canvasExecBufferMax)                                       \
        error("problem writing canvas context property in canvas graphics device");  \
    }

#define canvasContextExec(cGD, op, ...)          \
    canvasContextRender(cGD, op, ## __VA_ARGS__) \
    emscripten_run_script(cGD->buffer)

#define canvasColor(prop, col) {                                               \
    if (CALPHA(col)==255) {                                                    \
        canvasContextExec(cGD, (#prop "='rgb(%d, %d, %d)'"), CREDC(col),       \
            CGREENC(col), CBLUEC(col));                                        \
    } else {                                                                   \
        canvasContextExec(cGD, (#prop "='rgba(%d, %d, %d, %f)'"), CREDC(col),  \
            CGREENC(col), CBLUEC(col), ((double)CALPHA(col))/255.);            \
    }                                                                          \
}

typedef struct _canvasDesc {
    /* device specific stuff */
    int col;
    int fill;

    /* Line characteristics */
    double lwd;
    int lty;
    R_GE_lineend lend;
    R_GE_linejoin ljoin;
    double lmitre;

    char buffer[canvasExecBufferMax];
    pGEDevDesc RGE;
} canvasDesc;

void canvasSetLineType( canvasDesc *cGD, pGEcontext gc)
{
    /* Line width */
    if (cGD->lwd != gc->lwd){
        cGD->lwd = gc->lwd;
        canvasContextExec(cGD, ("lineWidth = %f"), 2*cGD->lwd);
    }

    /* Line end: par lend  */
    if (cGD->lend != gc->lend){
        cGD->lend = gc->lend;
        if (cGD->lend == GE_ROUND_CAP)
            canvasContextExec(cGD, ("lineCap = 'round'"));
        if (cGD->lend == GE_BUTT_CAP)
            canvasContextExec(cGD, ("lineCap = 'butt'"));
        if (cGD->lend == GE_SQUARE_CAP)
            canvasContextExec(cGD, ("lineCap = 'butt'"));
    }

    /* Line join: par ljoin */
    if (cGD->ljoin != gc->ljoin){
        cGD->ljoin = gc->ljoin;
        if (cGD->ljoin == GE_ROUND_JOIN)
            canvasContextExec(cGD, ("lineJoin = 'round'"));
        if (cGD->ljoin == GE_MITRE_JOIN)
            canvasContextExec(cGD, ("lineJoin = 'miter'"));
        if (cGD->ljoin == GE_BEVEL_JOIN)
            canvasContextExec(cGD, ("lineJoin = 'bevel'"));
    }

    /* Miter limit */
    if (cGD->lmitre != gc->lmitre){
        cGD->lmitre = gc->lmitre;
        canvasContextExec(cGD, ("miterLimit = %f"), cGD->lmitre);
    }
}

void canvasActivate(const pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
}

void canvasCircle(double x, double y, double r,
                  const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    canvasContextExec(cGD, ("beginPath()"));
    canvasContextExec(cGD, ("arc(%f,%f,%f,0,Math.PI*2,true)"), 2*x, 2*y, 2*r);
    if (CALPHA(gc->fill)){
        canvasColor(fillStyle,gc->fill);
        canvasContextExec(cGD, ("fill()"));
    }
    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        canvasContextExec(cGD, ("stroke()"));
    }
}

void canvasClip(double x0, double x1, double y0, double y1, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
}

void canvasClose(pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    /* Save plot */
    free(cGD);
    RGD->deviceSpecific = NULL;
}

void canvasDeactivate(pDevDesc RGD) {
    return;
}

static Rboolean canvasLocator(double *x, double *y, pDevDesc RGD)
{
    return FALSE;
}

void canvasLine(double x1, double y1, double x2, double y2,
                const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        canvasContextExec(cGD, ("beginPath()"));
        canvasContextExec(cGD, ("moveTo(%f,%f)"), 2*x1, 2*y1);
        canvasContextExec(cGD, ("lineTo(%f,%f)"), 2*x2, 2*y2);
        canvasContextExec(cGD, ("stroke()"));
    }
}

void canvasMetricInfo(int c, const pGEcontext gc, double* ascent,
                      double* descent, double* width, pDevDesc RGD)
{
    // This depends on the web fonts installed on the browser
    *ascent = *descent = *width = 0.0;
}

void canvasMode(int mode, pDevDesc RGD) {
    return;
}

void canvasNewPage(const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    canvasContextExec(cGD, ("clearRect(0,0,%f,%f)"),
                      2*RGD->right,2*RGD->bottom);

    /* Set background only if we have a color */
    if (CALPHA(gc->fill)){
        canvasColor(fillStyle,gc->fill);
        canvasContextExec(cGD, ("fillRect(0,0,%f,%f)"),
                          2*RGD->right,2*RGD->bottom);
    }
}

void canvasPolygon(int n, double *x, double *y,
                   const pGEcontext gc, pDevDesc RGD)
{
    int i=1;
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if(n<2) return;

    canvasSetLineType(cGD,gc);

    canvasContextExec(cGD, ("beginPath()"));
    canvasContextExec(cGD, ("moveTo(%f,%f)"), 2*x[0], 2*y[0]);
    while (i<n) {
        canvasContextExec(cGD, ("lineTo(%f, %f)"), 2*x[i], 2*y[i]); i++;
    }
    canvasContextExec(cGD, ("closePath()"));
    if (CALPHA(gc->fill)) {
        canvasColor(fillStyle,gc->fill);
        canvasContextExec(cGD, ("fill()"));
    }
    if (CALPHA(gc->col) && gc->lty!=-1) {
        canvasColor(strokeStyle,gc->col);
        canvasContextExec(cGD, ("stroke()"));
    }
}

void canvasPolyline(int n, double *x, double *y,
                    const pGEcontext gc, pDevDesc RGD)
{
    int i=1;
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if (n<2) return;

    if (CALPHA(gc->col) && gc->lty!=-1) {
    canvasContextExec(cGD, ("beginPath()"));
    canvasContextExec(cGD, ("moveTo(%f,%f)"), 2*x[0], 2*y[0]);
        while(i<n) {
            canvasContextExec(cGD, ("lineTo(%f, %f)"), 2*x[i], 2*y[i]); i++;
        }
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        canvasContextExec(cGD, ("stroke()"));
    }
}

void canvasRect(double x0, double y0, double x1, double y1,
                const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
    if (CALPHA(gc->fill)){
        canvasColor(fillStyle,gc->fill);
        canvasContextExec(cGD, ("fillRect(%f,%f,%f,%f)"),
                          2*x0, 2*y0, 2*x1-2*x0, 2*y1-2*y0);
    }
    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        canvasContextExec(cGD, ("strokeRect(%f,%f,%f,%f)"),
                          2*x0, 2*y0, 2*x1-2*x0, 2*y1-2*y0);
    }
}

void canvasSize(double *left, double *right, double *bottom, double *top,
                pDevDesc RGD)
{
    *left = *top = 0.0;
    *right = RGD->right;
    *bottom = RGD->bottom;
}

// Estimate the width of a string using character width heuristics
double canvasTextWidthEstimate(const char *str, double ps){
    double w = 0;
    for (int i = 0; i < strlen(str); i++) {
        char c = str[i];
        if (c == 'W' || c == 'M') w += 15;
        else if (c == 'w' || c == 'm') w += 12;
        else if (c == 'I' || c == 'i' || c == 'l' || c == 't' ||
                 c == 'f' || c == '[' || c == ']' || c == '1' ||
                 c == '(' || c == ')') w += 4;
        else if (c == 'r') w += 8;
        else if (isupper(c)) w += 12;
        else w += 10;
    }
    return ps*w/16.;
}

static double canvasStrWidth(const char *str, const pGEcontext gc, pDevDesc RGD)
{
    return canvasTextWidthEstimate(str, gc->ps);
}

void canvasText(double x, double y, const char *str, double rot, double hadj,
                const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
    canvasContextExec(cGD, ("font = %f+'px sans-serif'"), 2*gc->ps);
    double wi = canvasTextWidthEstimate(str, gc->ps);

    char *enc = malloc(3 * strlen(str) + 1);
    for (int n = 0; n < strlen(str); n++) {
        snprintf(enc + 3 * n, 4, "%%%02X", str[n]);
    }

    if (hadj!=0. || rot != 0.){
        if (rot!=0.){
            canvasContextExec(cGD, ("save()"));
            canvasColor(fillStyle,gc->col);
            canvasContextExec(cGD, ("translate(%f,%f)"), 2*x, 2*y);
            canvasContextExec(cGD, ("rotate(%f / 180 * Math.PI)"), -rot);
            canvasContextExec(cGD, ("fillText(decodeURIComponent(\\`%s\\`),-%f*%f,0)"),
                              enc, 2*wi, hadj);
            canvasContextExec(cGD, ("restore()"));
        } else {
            canvasColor(fillStyle,gc->col);
            canvasContextExec(cGD, ("fillText(decodeURIComponent(\\`%s\\`),%f-%f*%f,%f)"),
                              enc, 2*x, 2*wi, hadj, 2*y);
        }
    } else {
        canvasColor(fillStyle,gc->col);
        canvasContextExec(cGD, ("fillText(decodeURIComponent(\\`%s\\`),%f,%f)"),
                          enc, 2*x, 2*y);
    }
    free(enc);
}

SEXP void_setPattern(SEXP pattern, pDevDesc RGD) {
    return R_NilValue;
}
void void_releasePattern(SEXP ref, pDevDesc RGD) {
    return;
}
SEXP void_setClipPath(SEXP path, SEXP ref, pDevDesc RGD) {
    return R_NilValue;
}
void void_releaseClipPath(SEXP ref, pDevDesc RGD) {
    return;
}
SEXP void_setMask(SEXP path, SEXP ref, pDevDesc RGD) {
    return R_NilValue;
}
void void_releaseMask(SEXP ref, pDevDesc RGD) {
    return;
}
void void_raster(unsigned int *raster, int w, int h,
                 double x, double y,
                 double width, double height,
                 double rot,
                 Rboolean interpolate,
                 const pGEcontext gc, pDevDesc dd) {
    return;
}
void void_path(double *x, double *y,
               int npoly, int *nper,
               Rboolean winding,
               const pGEcontext gc, pDevDesc dd) {
    return;
}

SEXP ffi_dev_canvas(SEXP w, SEXP h, SEXP ps, SEXP bg)
{
    /* R Graphics Device: in GraphicsDevice.h */
    pDevDesc RGD;

    /* R Graphics Engine: in GraphicsEngine.h */
    pGEDevDesc RGE;

    /* canvas Graphics Device */
    canvasDesc *cGD;

    int width, height, bgcolor;
    double pointsize;

    if (!isNumeric(w)) error("`width' must be a number");
    width = asInteger(w);

    if (!isNumeric(h)) error("`height' must be a number");
    height = asInteger(h);

    if (!isNumeric(ps)) error("`pointsize' must be a number");
    pointsize = asReal(ps);

    if (!isString(bg) && !isInteger(bg) && !isLogical(bg) && !isReal(bg)) {
        error("invalid color specification for `bg'");
    }
    bgcolor = RGBpar(bg, 0);

    R_CheckDeviceAvailable();

    if (!(RGD = (pDevDesc)calloc(1, sizeof(NewDevDesc)))){
        error("calloc failed for canvas device");
    }

    if (!(cGD = (canvasDesc *)calloc(1, sizeof(canvasDesc)))){
        free(RGD);
        error("calloc failed for canvas device");
    }

    RGD->deviceSpecific = (void *) cGD;

    /* Callbacks */
    RGD->close = canvasClose;
    RGD->activate = canvasActivate;
    RGD->deactivate = canvasDeactivate;
    RGD->size = canvasSize;
    RGD->newPage = canvasNewPage;
    RGD->clip = canvasClip;
    RGD->strWidth = canvasStrWidth;
    RGD->text = canvasText;
    RGD->rect = canvasRect;
    RGD->circle = canvasCircle;
    RGD->line = canvasLine;
    RGD->polyline = canvasPolyline;
    RGD->polygon = canvasPolygon;
    RGD->locator = canvasLocator;
    RGD->mode = canvasMode;
    RGD->metricInfo = canvasMetricInfo;
    RGD->hasTextUTF8 = TRUE;
    RGD->strWidthUTF8 = canvasStrWidth;
    RGD->textUTF8 = canvasText;
    RGD->wantSymbolUTF8 = TRUE;
    RGD->path = void_path;
    RGD->raster = void_raster;
#if R_GE_version >= 13
    RGD->setPattern      = void_setPattern;
    RGD->releasePattern  = void_releasePattern;
    RGD->setClipPath     = void_setClipPath;
    RGD->releaseClipPath = void_releaseClipPath;
    RGD->setMask         = void_setMask;
    RGD->releaseMask     = void_releaseMask;
    RGD->deviceVersion = R_GE_definitions;
#endif
    /* Initialise RGD */
    RGD->left = RGD->clipLeft = 0;
    RGD->top = RGD->clipTop = 0;
    RGD->right = RGD->clipRight = width;
    RGD->bottom = RGD->clipBottom = height;
    RGD->xCharOffset = 0.4900;
    RGD->yCharOffset = 0.3333;
    RGD->yLineBias = 0.1;
    RGD->ipr[0] = 1.0/72.0;
    RGD->ipr[1] = 1.0/72.0;
    RGD->cra[0] = 0.9 * 12;
    RGD->cra[1] = 1.2 * 12;
    RGD->gamma = 1.0;
    RGD->canClip = TRUE;
    RGD->canChangeGamma = FALSE;
    RGD->canHAdj = 2;
    RGD->startps = pointsize;
    RGD->startcol = R_RGB(0,0,0);
    RGD->startfill = bgcolor;
    RGD->startlty = LTY_SOLID;
    RGD->startfont = 1;
    RGD->startgamma = RGD->gamma;
    RGD->displayListOn = FALSE;

    /* Add to the device list */
    RGE = GEcreateDevDesc(RGD);
    cGD->RGE = RGE;
    GEaddDevice(RGE);
    GEinitDisplayList(RGE);

    return R_NilValue;
}
#else
SEXP ffi_dev_canvas(SEXP args)
{
  error("This graphics device can only be used when running under webR.");
}
#endif // __EMSCRIPTEN__
