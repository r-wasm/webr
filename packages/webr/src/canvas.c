/*
 * R graphics device targeting the HTML canvas element
 * Description: R graphics device that generates HTML canvas API calls and
 *              draws the resulting image using a JavaScript OffscreenCanvas.
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

#define canvasColor(prop, col) {                                           \
    EM_ASM({                                                               \
        Module.canvasCtx.prop=`rgba(${$0}, ${$1}, ${$2}, ${$3})`;          \
    }, CREDC(col), CGREENC(col), CBLUEC(col), ((double)CALPHA(col))/255.); \
}

#define canvasClip(){                               \
    EM_ASM({                                        \
        Module.canvasCtx.beginPath();               \
        Module.canvasCtx.rect($0, $1, $2, $3);      \
        Module.canvasCtx.clip();                    \
    }, 2*cGD->cx, 2*cGD->cy, 2*cGD->cw, 2*cGD->ch); \
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

    /* Current clipping state */
    double cx, cy, cw, ch;

    pGEDevDesc RGE;
} canvasDesc;

void canvasSetLineType( canvasDesc *cGD, pGEcontext gc)
{
    /* Line width */
    if (cGD->lwd != gc->lwd){
        cGD->lwd = gc->lwd;
        EM_ASM({Module.canvasCtx.lineWidth = $0;}, 2*cGD->lwd);
    }

    /* Line type */
    if (cGD->lty != gc->lty){
        cGD->lty = gc->lty;

        // Line texture decoding - see comment in grDevices/src/devWindows.c
        int new_lty = cGD->lty;
        int ndash = 0;
        int dash_list[8];
        for( int i = 0; i < 8 && (new_lty & 15); i++) {
            dash_list[ndash++] = 2 * (new_lty & 15);
            new_lty = new_lty >> 4;
        }

        switch(ndash) {
        case 0:
            EM_ASM({Module.canvasCtx.setLineDash([]);});
            break;
        case 1:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0]);
            }, dash_list[0]*cGD->lwd);
            break;
        case 2:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd);
            break;
        case 3:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd);
            break;
        case 4:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2, $3]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd, dash_list[3]*cGD->lwd);
            break;
        case 5:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2, $3, $4]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd, dash_list[3]*cGD->lwd,
               dash_list[4]*cGD->lwd);
            break;
        case 6:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2, $3, $4, $5]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd, dash_list[3]*cGD->lwd,
               dash_list[4]*cGD->lwd, dash_list[5]*cGD->lwd);
            break;
        case 7:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2, $3, $4, $5, $6]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd, dash_list[3]*cGD->lwd,
               dash_list[4]*cGD->lwd, dash_list[5]*cGD->lwd,
               dash_list[6]*cGD->lwd);
            break;
        case 8:
            EM_ASM({
                Module.canvasCtx.setLineDash([$0, $1, $2, $3, $4, $5, $6, $7]);
            }, dash_list[0]*cGD->lwd, dash_list[1]*cGD->lwd,
               dash_list[2]*cGD->lwd, dash_list[3]*cGD->lwd,
               dash_list[4]*cGD->lwd, dash_list[5]*cGD->lwd,
               dash_list[6]*cGD->lwd, dash_list[7]*cGD->lwd);
            break;
        }
    }

    /* Line end: par lend  */
    if (cGD->lend != gc->lend){
        cGD->lend = gc->lend;
        if (cGD->lend == GE_ROUND_CAP)
            EM_ASM({Module.canvasCtx.lineCap = 'round';});
        if (cGD->lend == GE_BUTT_CAP)
            EM_ASM({Module.canvasCtx.lineCap = 'butt';});
        if (cGD->lend == GE_SQUARE_CAP)
            EM_ASM({Module.canvasCtx.lineCap = 'butt';});
    }

    /* Line join: par ljoin */
    if (cGD->ljoin != gc->ljoin){
        cGD->ljoin = gc->ljoin;
        if (cGD->ljoin == GE_ROUND_JOIN)
            EM_ASM({Module.canvasCtx.lineJoin = 'round';});
        if (cGD->ljoin == GE_MITRE_JOIN)
            EM_ASM({Module.canvasCtx.lineJoin = 'miter';});
        if (cGD->ljoin == GE_BEVEL_JOIN)
            EM_ASM({Module.canvasCtx.lineJoin = 'bevel';});
    }

    /* Miter limit */
    if (cGD->lmitre != gc->lmitre){
        cGD->lmitre = gc->lmitre;
        EM_ASM({Module.canvasCtx.miterLimit = $0;}, cGD->lmitre);
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

    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    EM_ASM({Module.canvasCtx.beginPath();});
    EM_ASM({
        Module.canvasCtx.arc($0, $1, $2, 0, Math.PI*2, true);
    }, 2*x, 2*y, 2*r);
    if (CALPHA(gc->fill)){
        canvasColor(fillStyle,gc->fill);
        EM_ASM({Module.canvasCtx.fill();});
    }
    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        EM_ASM({Module.canvasCtx.stroke();});
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasSetClip(double x0, double x1, double y0, double y1, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if (x1 < x0) { double t = x1; x1 = x0; x0 = t; };
    if (y1 < y0) { double t = y1; y1 = y0; y0 = t; };

    cGD->cx = x0;
    cGD->cy = y0;
    cGD->cw = (x1 - x0);
    cGD->ch = (y1 - y0);
}

void canvasClose(pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
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
    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD,gc);
        canvasColor(strokeStyle,gc->col);
        EM_ASM({Module.canvasCtx.beginPath();});
        EM_ASM({Module.canvasCtx.moveTo($0, $1);}, 2*x1, 2*y1);
        EM_ASM({Module.canvasCtx.lineTo($0, $1);}, 2*x2, 2*y2);
        EM_ASM({Module.canvasCtx.stroke();});
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasMetricInfo(int c, const pGEcontext gc, double* ascent,
                      double* descent, double* width, pDevDesc RGD)
{
    EM_ASM({
        const fface = (["", "", "bold", "italic", "bold italic"]);
        const fsans = (["", "sans-serif", "sans"]);
        const ffamily = (f) => fsans.includes(f) ? "sans-serif" : f;
        const font = `${fface[$2]} ${$0}px ${ffamily(UTF8ToString($1))}`;
        Module.canvasCtx.font = font;
    }, 2*gc->ps, gc->fontfamily, gc->fontface);

    *ascent = EM_ASM_DOUBLE({
        return Module.canvasCtx.measureText(
            String.fromCharCode($0)
        ).actualBoundingBoxAscent;
    }, c) / 2.0;

    *descent = EM_ASM_DOUBLE({
        return Module.canvasCtx.measureText(
            String.fromCharCode($0)
        ).actualBoundingBoxDescent;
    }, c) / 2.0;

    *width = EM_ASM_DOUBLE({
        return Module.canvasCtx.measureText(
            String.fromCharCode($0)
        ).width;
    }, c) / 2.0;
}

void canvasMode(int mode, pDevDesc RGD) {
    if (mode == 0) {
        canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
        EM_ASM({
            const image = Module.offscreenCanvas.transferToImageBitmap();
            chan.write({ type: 'canvas', data: { event: 'canvasImage', image } }, [image]);
        });
    }
    return;
}

void canvasNewPage(const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    EM_ASM({
        Module.canvasCtx.clearRect(0, 0, $0, $1);
    }, 2*RGD->right, 2*RGD->bottom);

    /* Set background only if we have a color */
    if (CALPHA(gc->fill)){
        canvasColor(fillStyle,gc->fill);
        EM_ASM({
            Module.canvasCtx.fillRect(0, 0, $0, $1);
        }, 2*RGD->right, 2*RGD->bottom);
    }

    EM_ASM({
        chan.write({ type: 'canvas', data: { event: 'canvasNewPage' } });
    });
}

void canvasPolygon(int n, double *x, double *y,
                   const pGEcontext gc, pDevDesc RGD)
{
    int i=1;
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if(n<2) return;

    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    canvasSetLineType(cGD,gc);

    EM_ASM({Module.canvasCtx.beginPath();});
    EM_ASM({Module.canvasCtx.moveTo($0, $1);}, 2*x[0], 2*y[0]);
    while (i<n) {
        EM_ASM({Module.canvasCtx.lineTo($0, $1);}, 2*x[i], 2*y[i]);
        i++;
    }
    EM_ASM({Module.canvasCtx.closePath();});
    if (CALPHA(gc->fill)) {
        canvasColor(fillStyle, gc->fill);
        EM_ASM({Module.canvasCtx.fill();});
    }
    if (CALPHA(gc->col) && gc->lty!=-1) {
        canvasColor(strokeStyle, gc->col);
        EM_ASM({Module.canvasCtx.stroke();});
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasPolyline(int n, double *x, double *y,
                    const pGEcontext gc, pDevDesc RGD)
{
    int i=1;
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    if (n<2) return;

    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    if (CALPHA(gc->col) && gc->lty!=-1) {
        EM_ASM({Module.canvasCtx.beginPath();});
        EM_ASM({Module.canvasCtx.moveTo($0, $1);}, 2*x[0], 2*y[0]);
        while(i<n) {
            EM_ASM({Module.canvasCtx.lineTo($0, $1);}, 2*x[i], 2*y[i]);
            i++;
        }
        canvasSetLineType(cGD, gc);
        canvasColor(strokeStyle, gc->col);
        EM_ASM({Module.canvasCtx.stroke();});
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasPath(double *x, double *y,
               int npoly, int *nper,
               Rboolean winding,
               const pGEcontext gc, pDevDesc RGD) {
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;

    int j = 0;
    EM_ASM({Module.canvasCtx.beginPath();});
    for (int i = 0; i < npoly; i++) {
        int n = j + nper[i];
        if (CALPHA(gc->col) && gc->lty != -1) {
            EM_ASM({Module.canvasCtx.moveTo($0, $1);}, 2*x[j], 2*y[j]);
            j++;
            while(j < n) {
                EM_ASM({Module.canvasCtx.lineTo($0, $1);}, 2*x[j], 2*y[j]);
                j++;
            }
            EM_ASM({Module.canvasCtx.closePath();});
        }
    }

    if (CALPHA(gc->fill)) {
        canvasColor(fillStyle, gc->fill);
        EM_ASM({Module.canvasCtx.fill($0 ? "nonzero" : "evenodd");}, winding);
    }
    if (CALPHA(gc->col) && gc->lty != -1) {
        canvasColor(strokeStyle, gc->col);
        EM_ASM({Module.canvasCtx.stroke();});
    }
}

void canvasRect(double x0, double y0, double x1, double y1,
                const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    if (CALPHA(gc->fill)){
        canvasColor(fillStyle, gc->fill);
        EM_ASM({
            Module.canvasCtx.fillRect($0, $1, $2, $3);
        }, 2*x0, 2*y0, 2*x1-2*x0, 2*y1-2*y0);
    }
    if (CALPHA(gc->col) && gc->lty!=-1){
        canvasSetLineType(cGD, gc);
        canvasColor(strokeStyle, gc->col);
        EM_ASM({
            Module.canvasCtx.strokeRect($0, $1, $2, $3);
        }, 2*x0, 2*y0, 2*x1-2*x0, 2*y1-2*y0);
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasSize(double *left, double *right, double *bottom, double *top,
                pDevDesc RGD)
{
    *left = *top = 0.0;
    *right = RGD->right;
    *bottom = RGD->bottom;
}

static double canvasStrWidth(const char *str, const pGEcontext gc, pDevDesc RGD)
{
    return EM_ASM_DOUBLE({
        const fface = (["", "", "bold", "italic", "bold italic"]);
        const fsans = (["", "sans-serif", "sans"]);
        const ffamily = (f) => fsans.includes(f) ? "sans-serif" : f;
        const font = `${fface[$2]} ${$0}px ${ffamily(UTF8ToString($1))}`;
        Module.canvasCtx.font = font;
        return Module.canvasCtx.measureText(UTF8ToString($3)).width;
    }, 2*gc->ps, gc->fontfamily, gc->fontface, str) / 2.0;
}

void canvasText(double x, double y, const char *str, double rot, double hadj,
                const pGEcontext gc, pDevDesc RGD)
{
    canvasDesc *cGD = (canvasDesc *)RGD->deviceSpecific;
    EM_ASM({Module.canvasCtx.save();});
    canvasClip();

    double wi = canvasStrWidth(str, gc, RGD);

    if (hadj!=0. || rot != 0.){
        if (rot!=0.){
            EM_ASM({Module.canvasCtx.save();});
            canvasColor(fillStyle, gc->col);
            EM_ASM({Module.canvasCtx.translate($0, $1);}, 2*x, 2*y);
            EM_ASM({Module.canvasCtx.rotate($0 / 180 * Math.PI);}, -rot);
            EM_ASM({
                Module.canvasCtx.fillText(UTF8ToString($0), -$1*$2, 0);
            }, str, 2*wi, hadj);
            EM_ASM({Module.canvasCtx.restore();});
        } else {
            canvasColor(fillStyle, gc->col);
            EM_ASM({
                Module.canvasCtx.fillText(UTF8ToString($0), $1-$2*$3, $4);
            }, str, 2*x, 2*wi, hadj, 2*y);
        }
    } else {
        canvasColor(fillStyle, gc->col);
        EM_ASM({
            Module.canvasCtx.fillText(UTF8ToString($0), $1, $2);
        }, str, 2*x, 2*y);
    }

    EM_ASM({Module.canvasCtx.restore();});
}

void canvasRaster(unsigned int *raster, int w, int h,
                  double x, double y,
                  double width, double height,
                  double rot,
                  Rboolean interpolate,
                  const pGEcontext gc, pDevDesc dd) {
    if (height < 0) {
        y += height;
        height = -height;
    }

    EM_ASM({Module.canvasCtx.save();});
    EM_ASM({Module.canvasCtx.translate($0, $1);}, 2*x, 2*y);
    if (rot != 0.) {
        EM_ASM({Module.canvasCtx.translate($0, $1);}, 0, 2*height);
        EM_ASM({Module.canvasCtx.rotate($0 / 180 * Math.PI);}, -rot);
        EM_ASM({Module.canvasCtx.translate($0, $1);}, 0, -2*height);
    }

    if (interpolate) {
        EM_ASM({Module.canvasCtx.imageSmoothingEnabled = true;});
    } else {
        EM_ASM({Module.canvasCtx.imageSmoothingEnabled = false;});
    }

    EM_ASM({
        const raster = Module.HEAPU8.subarray($0, $0 + 4 * $1 * $2);
        const img = new ImageData(new Uint8ClampedArray(raster), $1, $2);
        const buffer = new OffscreenCanvas($1, $2);
        buffer.getContext('2d').putImageData(img, 0, 0);
        Module.canvasCtx.drawImage(buffer, 0, 0, $3, $4);
    }, raster, w, h, 2*width, 2*height);

    EM_ASM({Module.canvasCtx.restore();});
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
    RGD->clip = canvasSetClip;
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
    RGD->path = canvasPath;
    RGD->raster = canvasRaster;
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

    int no_canvas =  EM_ASM_INT({
        return typeof OffscreenCanvas === "undefined";
    });

    if (no_canvas) {
        Rf_error(
            "This browser does not have support for OffscreenCanvas rendering. "
            "Consider instead using a bitmap graphics device, such as png()."
        );
    }

    EM_ASM({
        Module.offscreenCanvas = new OffscreenCanvas($0, $1);
        Module.canvasCtx = Module.offscreenCanvas.getContext('2d');
    }, 2*width, 2*height);

    return R_NilValue;
}
#else
SEXP ffi_dev_canvas(SEXP args)
{
  error("This graphics device can only be used when running under webR.");
}
#endif // __EMSCRIPTEN__
