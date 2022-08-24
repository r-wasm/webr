pkgname <- "grDevices"
source(file.path(R.home("share"), "R", "examples-header.R"))
options(warn = 1)
library('grDevices')

base::assign(".oldSearch", base::search(), pos = 'CheckExEnv')
base::assign(".old_wd", base::getwd(), pos = 'CheckExEnv')
cleanEx()
nameEx("Devices")
### * Devices

flush(stderr()); flush(stdout())

### Name: Devices
### Title: List of Graphical Devices
### Aliases: Devices device
### Keywords: device

### ** Examples
## Not run: 
##D ## open the default screen device on this platform if no device is
##D ## open
##D if(dev.cur() == 1) dev.new()
## End(Not run)


cleanEx()
nameEx("Hershey")
### * Hershey

flush(stderr()); flush(stdout())

### Name: Hershey
### Title: Hershey Vector Fonts in R
### Aliases: Hershey
### Keywords: aplot

### ** Examples

Hershey

## for tables of examples, see demo(Hershey)



cleanEx()
nameEx("Japanese")
### * Japanese

flush(stderr()); flush(stdout())

### Name: Japanese
### Title: Japanese characters in R
### Aliases: Japanese
### Keywords: aplot

### ** Examples

require(graphics)

plot(1:9, type = "n", axes = FALSE, frame.plot = TRUE, ylab = "",
     main = "example(Japanese)", xlab = "using Hershey fonts")
par(cex = 3)
Vf <- c("serif", "plain")
text(4, 2, "\\#J244b\\#J245b\\#J2473", vfont = Vf)
text(4, 4, "\\#J2538\\#J2563\\#J2551\\#J2573", vfont = Vf)
text(4, 6, "\\#J467c\\#J4b5c", vfont = Vf)
text(4, 8, "Japan", vfont = Vf)
par(cex = 1)
text(8, 2, "Hiragana")
text(8, 4, "Katakana")
text(8, 6, "Kanji")
text(8, 8, "English")



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("Type1Font")
### * Type1Font

flush(stderr()); flush(stdout())

### Name: Type1Font
### Title: Type 1 and CID Fonts
### Aliases: Type1Font CIDFont
### Keywords: device

### ** Examples

## This duplicates "ComputerModernItalic".
CMitalic <- Type1Font("ComputerModern2",
                      c("CM_regular_10.afm", "CM_boldx_10.afm",
                        "cmti10.afm", "cmbxti10.afm",
                        "CM_symbol_10.afm"),
                      encoding = "TeXtext.enc")

## Not run: 
##D ## This could be used by
##D postscript(family = CMitalic)
##D ## or
##D postscriptFonts(CMitalic = CMitalic)  # once in a session
##D postscript(family = "CMitalic", encoding = "TeXtext.enc")
## End(Not run)


cleanEx()
nameEx("adjustcolor")
### * adjustcolor

flush(stderr()); flush(stdout())

### Name: adjustcolor
### Title: Adjust Colors in One or More Directions Conveniently.
### Aliases: adjustcolor

### ** Examples

## Illustrative examples :
opal <- palette("default")
stopifnot(identical(adjustcolor(1:8,       0.75),
                    adjustcolor(palette(), 0.75)))
cbind(palette(), adjustcolor(1:8, 0.75))

##  alpha = 1/2 * previous alpha --> opaque colors
x <- palette(adjustcolor(palette(), 0.5))

sines <- outer(1:20, 1:4, function(x, y) sin(x / 20 * pi * y))
matplot(sines, type = "b", pch = 21:23, col = 2:5, bg = 2:5,
        main = "Using an 'opaque ('translucent') color palette")

x. <- adjustcolor(x, offset = c(0.5, 0.5, 0.5, 0), # <- "more white"
                  transform = diag(c(.7, .7, .7, 0.6)))
cbind(x, x.)
op <- par(bg = adjustcolor("goldenrod", offset = -rep(.4, 4)), xpd = NA)
plot(0:9, 0:9, type = "n", axes = FALSE, xlab = "", ylab = "",
     main = "adjustcolor() -> translucent")
text(1:8, labels = paste0(x,"++"), col = x., cex = 8)
par(op)

## and

(M <- cbind( rbind( matrix(1/3, 3, 3), 0), c(0, 0, 0, 1)))
adjustcolor(x, transform = M)

## revert to previous palette: active
palette(opal)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("as.raster")
### * as.raster

flush(stderr()); flush(stdout())

### Name: as.raster
### Title: Create a Raster Object
### Aliases: is.raster as.raster as.raster.logical as.raster.numeric
###   as.raster.raw as.raster.character as.raster.matrix as.raster.array
### Keywords: dplot

### ** Examples

# A red gradient
as.raster(matrix(hcl(0, 80, seq(50, 80, 10)),
                 nrow = 4, ncol = 5))

# Vectors are 1-column matrices ...
#   character vectors are color names ...
as.raster(hcl(0, 80, seq(50, 80, 10)))
#   numeric vectors are greyscale ...
as.raster(1:5, max = 5)
#   logical vectors are black and white ...
as.raster(1:10 %% 2 == 0)

# ... unless nrow/ncol are supplied ...
as.raster(1:10 %% 2 == 0, nrow = 1)

# Matrix can also be logical or numeric (or raw) ...
as.raster(matrix(c(TRUE, FALSE), nrow = 3, ncol = 2))
as.raster(matrix(1:3/4, nrow = 3, ncol = 4))

# An array can be 3-plane numeric (R, G, B planes) ...
as.raster(array(c(0:1, rep(0.5, 4)), c(2, 1, 3)))

# ... or 4-plane numeric (R, G, B, A planes)
as.raster(array(c(0:1, rep(0.5, 6)), c(2, 1, 4)))

# subsetting
r <- as.raster(matrix(colors()[1:100], ncol = 10))
r[, 2]
r[2:4, 2:5]

# assigning to subset
r[2:4, 2:5] <- "white"

# comparison
r == "white"

## Don't show: 
stopifnot(r[] == r,
          identical(r[3:5], colors()[3:5]))
r[2:4] <- "black"
stopifnot(identical(r[1:4, 1], as.raster(c("white", rep("black", 3)))))
## End(Don't show)



cleanEx()
nameEx("axisTicks")
### * axisTicks

flush(stderr()); flush(stdout())

### Name: axisTicks
### Title: Compute Pretty Axis Tick Scales
### Aliases: axisTicks .axisPars
### Keywords: dplot

### ** Examples

##--- Demonstrating correspondence between graphics'
##--- axis() and the graphics-engine agnostic  axisTicks() :

require("graphics")
plot(10*(0:10)); (pu <- par("usr"))
aX <- function(side, at, ...)
    axis(side, at = at, labels = FALSE, lwd.ticks = 2, col.ticks = 2,
         tck = 0.05, ...)
aX(1, print(xa <- axisTicks(pu[1:2], log = FALSE)))  # x axis
aX(2, print(ya <- axisTicks(pu[3:4], log = FALSE)))  # y axis

axisTicks(pu[3:4], log = FALSE, nint = 10)

plot(10*(0:10), log = "y"); (pu <- par("usr"))
aX(2, print(ya <- axisTicks(pu[3:4], log = TRUE)))  # y axis

plot(2^(0:9), log = "y"); (pu <- par("usr"))
aX(2, print(ya <- axisTicks(pu[3:4], log = TRUE)))  # y axis




graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("boxplot.stats")
### * boxplot.stats

flush(stderr()); flush(stdout())

### Name: boxplot.stats
### Title: Box Plot Statistics
### Aliases: boxplot.stats
### Keywords: dplot

### ** Examples

require(stats)
x <- c(1:100, 1000)
(b1 <- boxplot.stats(x))
(b2 <- boxplot.stats(x, do.conf = FALSE, do.out = FALSE))
stopifnot(b1 $ stats == b2 $ stats) # do.out = FALSE is still robust
boxplot.stats(x, coef = 3, do.conf = FALSE)
## no outlier treatment:
boxplot.stats(x, coef = 0)

boxplot.stats(c(x, NA)) # slight change : n is 101
(r <- boxplot.stats(c(x, -1:1/0)))
stopifnot(r$out == c(1000, -Inf, Inf))

## Don't show: 
 ## Difference between quartiles and hinges :
 nn <- 1:17 ;  n4 <- nn %% 4
 hin <- sapply(sapply(nn, seq), function(x) boxplot.stats(x)$stats[c(2,4)])
 q13 <- sapply(sapply(nn, seq), quantile, probs = c(1,3)/4, names = FALSE)
 m <- t(rbind(q13,hin))[, c(1,3,2,4)]
 dimnames(m) <- list(paste(nn), c("q1","lH", "q3","uH"))
 stopifnot(m[n4 == 1, 1:2] == (nn[n4 == 1] + 3)/4,   # quart. = hinge
           m[n4 == 1, 3:4] == (3*nn[n4 == 1] + 1)/4,
           m[,"lH"] == ( (nn+3) %/% 2) / 2,
           m[,"uH"] == ((3*nn+2)%/% 2) / 2)
 cm <- noquote(format(m))
 cm[m[,2] == m[,1], 2] <- " = "
 cm[m[,4] == m[,3], 4] <- " = "
 cm
## End(Don't show)




cleanEx()
nameEx("cairoSymbolFont")
### * cairoSymbolFont

flush(stderr()); flush(stdout())

### Name: cairoSymbolFont
### Title: Specify a Symbol Font
### Aliases: cairoSymbolFont
### Keywords: device

### ** Examples

## Not run: 
##D ## If a font uses PUA, we can just specify the font name ...
##D cairo_pdf(symbolfamily="OpenSymbol")
##D dev.off()
##D ## ... or equivalently ...
##D cairo_pdf(symbolfamily=cairoSymbolFont("OpenSymbol"))
##D dev.off()
##D 
##D ## If a font does not use PUA, we must indicate that ...
##D cairo_pdf(symbolfamily=cairoSymbolFont("Nimbus Sans", usePUA=FALSE))
##D dev.off()
## End(Not run)



cleanEx()
nameEx("check.options")
### * check.options

flush(stderr()); flush(stdout())

### Name: check.options
### Title: Set Options with Consistency Checks
### Aliases: check.options
### Keywords: utilities programming

### ** Examples

(L1 <- list(a = 1:3, b = pi, ch = "CH"))
check.options(list(a = 0:2), name.opt = "L1")
check.options(NULL, reset = TRUE, name.opt = "L1")



cleanEx()
nameEx("chull")
### * chull

flush(stderr()); flush(stdout())

### Name: chull
### Title: Compute Convex Hull of a Set of Points
### Aliases: chull
### Keywords: graphs

### ** Examples

X <- matrix(stats::rnorm(2000), ncol = 2)
chull(X)
## Not run: 
##D   # Example usage from graphics package
##D   plot(X, cex = 0.5)
##D   hpts <- chull(X)
##D   hpts <- c(hpts, hpts[1])
##D   lines(X[hpts, ])
## End(Not run)



cleanEx()
nameEx("cm")
### * cm

flush(stderr()); flush(stdout())

### Name: cm
### Title: Unit Transformation
### Aliases: cm
### Keywords: dplot

### ** Examples

cm(1)  # = 2.54

## Translate *from* cm *to* inches:

10 / cm(1) # -> 10cm  are 3.937 inches



cleanEx()
nameEx("col2rgb")
### * col2rgb

flush(stderr()); flush(stdout())

### Name: col2rgb
### Title: Color to RGB Conversion
### Aliases: col2rgb
### Keywords: color dplot

### ** Examples

col2rgb("peachpuff")
col2rgb(c(blu = "royalblue", reddish = "tomato"))  # note: colnames

col2rgb(1:8)  # the ones from the palette() (if the default)

col2rgb(paste0("gold", 1:4))

col2rgb("#08a0ff")
## all three kinds of color specifications:
col2rgb(c(red = "red", hex = "#abcdef"))
col2rgb(c(palette = 1:3))

##-- NON-INTRODUCTORY examples --

grC <- col2rgb(paste0("gray", 0:100))
table(print(diff(grC["red",])))  # '2' or '3': almost equidistant
## The 'named' grays are in between {"slate gray" is not gray, strictly}
col2rgb(c(g66 = "gray66", darkg =  "dark gray", g67 = "gray67",
          g74 = "gray74", gray  =       "gray", g75 = "gray75",
          g82 = "gray82", light = "light gray", g83 = "gray83"))

crgb <- col2rgb(cc <- colors())
colnames(crgb) <- cc
t(crgb)  # The whole table

ccodes <- c(256^(2:0) %*% crgb)  # = internal codes
## How many names are 'aliases' of each other:
table(tcc <- table(ccodes))
length(uc <- unique(sort(ccodes))) # 502
## All the multiply named colors:
mult <- uc[tcc >= 2]
cl <- lapply(mult, function(m) cc[ccodes == m])
names(cl) <- apply(col2rgb(sapply(cl, function(x)x[1])),
                   2, function(n)paste(n, collapse = ","))
utils::str(cl)
## Not run: 
##D  if(require(xgobi)) { ## Look at the color cube dynamically :
##D    tc <- t(crgb[, !duplicated(ccodes)])
##D    table(is.gray <- tc[,1] == tc[,2] & tc[,2] == tc[,3])  # (397, 105)
##D    xgobi(tc, color = c("gold", "gray")[1 + is.gray])
##D  }
## End(Not run)



cleanEx()
nameEx("colorRamp")
### * colorRamp

flush(stderr()); flush(stdout())

### Name: colorRamp
### Title: Color interpolation
### Aliases: colorRamp colorRampPalette
### Keywords: color

### ** Examples

## Both return a *function* :
colorRamp(c("red", "green"))( (0:4)/4 ) ## (x) , x in [0,1]
colorRampPalette(c("blue", "red"))( 4 ) ## (n)
## a ramp in opacity of blue values
colorRampPalette(c(rgb(0,0,1,1), rgb(0,0,1,0)), alpha = TRUE)(8)

require(graphics)

## Here space="rgb" gives palettes that vary only in saturation,
## as intended.
## With space="Lab" the steps are more uniform, but the hues
## are slightly purple.
filled.contour(volcano,
               color.palette =
                   colorRampPalette(c("red", "white", "blue")),
               asp = 1)
filled.contour(volcano,
               color.palette =
                   colorRampPalette(c("red", "white", "blue"),
                                    space = "Lab"),
               asp = 1)

## Interpolating a 'sequential' ColorBrewer palette
YlOrBr <- c("#FFFFD4", "#FED98E", "#FE9929", "#D95F0E", "#993404")
filled.contour(volcano,
               color.palette = colorRampPalette(YlOrBr, space = "Lab"),
               asp = 1)
filled.contour(volcano,
               color.palette = colorRampPalette(YlOrBr, space = "Lab",
                                                bias = 0.5),
               asp = 1)

## 'jet.colors' is "as in Matlab"
## (and hurting the eyes by over-saturation)
jet.colors <-
  colorRampPalette(c("#00007F", "blue", "#007FFF", "cyan",
                     "#7FFF7F", "yellow", "#FF7F00", "red", "#7F0000"))
filled.contour(volcano, color.palette = jet.colors, asp = 1)

## space="Lab" helps when colors don't form a natural sequence
m <- outer(1:20,1:20,function(x,y) sin(sqrt(x*y)/3))
rgb.palette <- colorRampPalette(c("red", "orange", "blue"),
                                space = "rgb")
Lab.palette <- colorRampPalette(c("red", "orange", "blue"),
                                space = "Lab")
filled.contour(m, col = rgb.palette(20))
filled.contour(m, col = Lab.palette(20))



cleanEx()
nameEx("colors")
### * colors

flush(stderr()); flush(stdout())

### Name: colors
### Title: Color Names
### Aliases: colors colours
### Keywords: color dplot sysdata

### ** Examples

cl <- colors()
length(cl); cl[1:20]

length(cl. <- colors(TRUE))
## only 502 of the 657 named ones

## ----------- Show all named colors and more:
demo("colors")
## -----------



cleanEx()
nameEx("contourLines")
### * contourLines

flush(stderr()); flush(stdout())

### Name: contourLines
### Title: Calculate Contour Lines
### Aliases: contourLines
### Keywords: dplot

### ** Examples

x <- 10*1:nrow(volcano)
y <- 10*1:ncol(volcano)
cl <- contourLines(x, y, volcano)
## summarize the sizes of each the contour lines :
cbind(lev = vapply(cl, `[[`, .5, "level"),
       n  = vapply(cl, function(l) length(l$x), 1))

z <- outer(-9:25, -9:25)
pretty(range(z), 10) # -300 -200 ... 600 700
utils::str(c2 <- contourLines(z))
   # no segments for {-300, 700};
   #  2 segments for {-200, -100, 0}
   #  1 segment  for  100:600



cleanEx()
nameEx("convertColor")
### * convertColor

flush(stderr()); flush(stdout())

### Name: convertColor
### Title: Convert between Colour Spaces
### Aliases: convertColor colorspaces
### Keywords: color

### ** Examples

## The displayable colors from four planes of Lab space
ab <- expand.grid(a = (-10:15)*10,
                  b = (-15:10)*10)
require(graphics); require(stats) # for na.omit
par(mfrow = c(2, 2), mar = .1+c(3, 3, 3, .5), mgp = c(2,  .8,  0))

Lab <- cbind(L = 20, ab)
srgb <- convertColor(Lab, from = "Lab", to = "sRGB", clip = NA)
clipped <- attr(na.omit(srgb), "na.action")
srgb[clipped, ] <- 0
cols <- rgb(srgb[, 1], srgb[, 2], srgb[, 3])
image((-10:15)*10, (-15:10)*10, matrix(1:(26*26), ncol = 26), col = cols,
  xlab = "a", ylab = "b", main = "Lab: L=20")

Lab <- cbind(L = 40, ab)
srgb <- convertColor(Lab, from = "Lab", to = "sRGB", clip = NA)
clipped <- attr(na.omit(srgb), "na.action")
srgb[clipped, ] <- 0
cols <- rgb(srgb[, 1], srgb[, 2], srgb[, 3])
image((-10:15)*10, (-15:10)*10, matrix(1:(26*26), ncol = 26), col = cols,
  xlab = "a", ylab = "b", main = "Lab: L=40")

Lab <- cbind(L = 60, ab)
srgb <- convertColor(Lab, from = "Lab", to = "sRGB", clip = NA)
clipped <- attr(na.omit(srgb), "na.action")
srgb[clipped, ] <- 0
cols <- rgb(srgb[, 1], srgb[, 2], srgb[, 3])
image((-10:15)*10, (-15:10)*10, matrix(1:(26*26), ncol = 26), col = cols,
  xlab = "a", ylab = "b", main = "Lab: L=60")

Lab <- cbind(L = 80, ab)
srgb <- convertColor(Lab, from = "Lab", to = "sRGB", clip = NA)
clipped <- attr(na.omit(srgb), "na.action")
srgb[clipped, ] <- 0
cols <- rgb(srgb[, 1], srgb[, 2], srgb[, 3])
image((-10:15)*10, (-15:10)*10, matrix(1:(26*26), ncol = 26), col = cols,
  xlab = "a", ylab = "b", main = "Lab: L=80")

cols <- t(col2rgb(palette())); rownames(cols) <- palette(); cols
zapsmall(lab <- convertColor(cols, from = "sRGB", to = "Lab", scale.in = 255))
stopifnot(all.equal(cols, # converting back.. getting the original:
   round(convertColor(lab, from = "Lab", to = "sRGB", scale.out = 255)),
                    check.attributes = FALSE))



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("densCols")
### * densCols

flush(stderr()); flush(stdout())

### Name: densCols
### Title: Colors for Smooth Density Plots
### Aliases: densCols blues9
### Keywords: dplot

### ** Examples


cleanEx()
nameEx("dev")
### * dev

flush(stderr()); flush(stdout())

### Name: dev
### Title: Control Multiple Devices
### Aliases: dev.cur dev.list dev.next dev.prev dev.off dev.set dev.new
###   graphics.off
### Keywords: device iplot

### ** Examples

## Not run: 
##D ## Unix-specific example
##D x11()
##D plot(1:10)
##D x11()
##D plot(rnorm(10))
##D dev.set(dev.prev())
##D abline(0, 1) # through the 1:10 points
##D dev.set(dev.next())
##D abline(h = 0, col = "gray") # for the residual plot
##D dev.set(dev.prev())
##D dev.off(); dev.off() #- close the two X devices
## End(Not run)



cleanEx()
nameEx("dev.capabilities")
### * dev.capabilities

flush(stderr()); flush(stdout())

### Name: dev.capabilities
### Title: Query Capabilities of the Current Graphics Device
### Aliases: dev.capabilities
### Keywords: dplot

### ** Examples

dev.capabilities()



cleanEx()
nameEx("dev.interactive")
### * dev.interactive

flush(stderr()); flush(stdout())

### Name: dev.interactive
### Title: Is the Current Graphics Device Interactive?
### Aliases: dev.interactive deviceIsInteractive
### Keywords: device

### ** Examples

dev.interactive()
print(deviceIsInteractive(NULL))



cleanEx()
nameEx("dev.size")
### * dev.size

flush(stderr()); flush(stdout())

### Name: dev.size
### Title: Find Size of Device Surface
### Aliases: dev.size
### Keywords: dplot

### ** Examples

dev.size("cm")



cleanEx()
nameEx("dev2")
### * dev2

flush(stderr()); flush(stdout())

### Name: dev2
### Title: Copy Graphics Between Multiple Devices
### Aliases: dev.copy dev.print dev.copy2eps dev.copy2pdf dev.control
### Keywords: device

### ** Examples

## Not run: 
##D x11() # on a Unix-alike
##D plot(rnorm(10), main = "Plot 1")
##D dev.copy(device = x11)
##D mtext("Copy 1", 3)
##D dev.print(width = 6, height = 6, horizontal = FALSE) # prints it
##D dev.off(dev.prev())
##D dev.off()
## End(Not run)



cleanEx()
nameEx("extendrange")
### * extendrange

flush(stderr()); flush(stdout())

### Name: extendrange
### Title: Extend a Numerical Range by a Small Percentage
### Aliases: extendrange
### Keywords: dplot

### ** Examples

x <- 1:5
(r <- range(x))         # 1    5
extendrange(x)          # 0.8  5.2
extendrange(x, f= 0.01) # 0.96 5.04

## extend more to the right:
extendrange(x, f=c(.01,.03)) # 0.96 5.12

## Use 'r' if you have it already:
stopifnot(identical(extendrange(r = r),
                    extendrange(x)))



cleanEx()
nameEx("getGraphicsEvent")
### * getGraphicsEvent

flush(stderr()); flush(stdout())

### Name: getGraphicsEvent
### Title: Wait for a mouse or keyboard event from a graphics window
### Aliases: getGraphicsEvent setGraphicsEventHandlers getGraphicsEventEnv
###   setGraphicsEventEnv
### Keywords: iplot

### ** Examples

# This currently only works on the Windows, X11(type = "Xlib"), and
# X11(type = "cairo") screen devices...
## Not run: 
##D savepar <- par(ask = FALSE)
##D dragplot <- function(..., xlim = NULL, ylim = NULL, xaxs = "r", yaxs = "r") {
##D     plot(..., xlim = xlim, ylim = ylim, xaxs = xaxs, yaxs = yaxs)
##D     startx <- NULL
##D     starty <- NULL
##D     prevx <- NULL
##D     prevy <- NULL
##D     usr <- NULL
##D 
##D     devset <- function()
##D         if (dev.cur() != eventEnv$which) dev.set(eventEnv$which)
##D 
##D     dragmousedown <- function(buttons, x, y) {
##D         startx <<- x
##D         starty <<- y
##D         prevx <<- 0
##D         prevy <<- 0
##D         devset()
##D         usr <<- par("usr")
##D         eventEnv$onMouseMove <- dragmousemove
##D         NULL
##D     }
##D 
##D     dragmousemove <- function(buttons, x, y) {
##D         devset()
##D         deltax <- diff(grconvertX(c(startx, x), "ndc", "user"))
##D         deltay <- diff(grconvertY(c(starty, y), "ndc", "user"))
##D 	if (abs(deltax-prevx) + abs(deltay-prevy) > 0) {
##D 	    plot(..., xlim = usr[1:2]-deltax, xaxs = "i",
##D 		      ylim = usr[3:4]-deltay, yaxs = "i")
##D 	    prevx <<- deltax
##D 	    prevy <<- deltay
##D 	}
##D         NULL
##D     }
##D 
##D     mouseup <- function(buttons, x, y) {
##D     	eventEnv$onMouseMove <- NULL
##D     }	
##D 
##D     keydown <- function(key) {
##D         if (key == "q") return(invisible(1))
##D         eventEnv$onMouseMove <- NULL
##D         NULL
##D     }
##D 
##D     setGraphicsEventHandlers(prompt = "Click and drag, hit q to quit",
##D                      onMouseDown = dragmousedown,
##D                      onMouseUp = mouseup,
##D                      onKeybd = keydown)
##D     eventEnv <- getGraphicsEventEnv()
##D }
##D 
##D dragplot(rnorm(1000), rnorm(1000))
##D getGraphicsEvent()
##D par(savepar)
## End(Not run)



cleanEx()
nameEx("grSoftVersion")
### * grSoftVersion

flush(stderr()); flush(stdout())

### Name: grSoftVersion
### Title: Report Versions of Graphics Software
### Aliases: grSoftVersion

### ** Examples




cleanEx()
nameEx("gray")
### * gray

flush(stderr()); flush(stdout())

### Name: gray
### Title: Gray Level Specification
### Aliases: gray grey
### Keywords: color

### ** Examples

gray(0:8 / 8)



cleanEx()
nameEx("gray.colors")
### * gray.colors

flush(stderr()); flush(stdout())

### Name: gray.colors
### Title: Gray Color Palette
### Aliases: gray.colors grey.colors
### Keywords: color

### ** Examples

require(graphics)

pie(rep(1, 12), col = gray.colors(12))
barplot(1:12, col = gray.colors(12))



cleanEx()
nameEx("hcl")
### * hcl

flush(stderr()); flush(stdout())

### Name: hcl
### Title: HCL Color Specification
### Aliases: hcl
### Keywords: color dplot

### ** Examples

require(graphics)

# The Foley and Van Dam PhD Data.
csd <- matrix(c( 4,2,4,6, 4,3,1,4, 4,7,7,1,
                 0,7,3,2, 4,5,3,2, 5,4,2,2,
                 3,1,3,0, 4,4,6,7, 1,10,8,7,
                 1,5,3,2, 1,5,2,1, 4,1,4,3,
                 0,3,0,6, 2,1,5,5), nrow = 4)

csphd <- function(colors)
  barplot(csd, col = colors, ylim = c(0,30),
          names.arg = 72:85, xlab = "Year", ylab = "Students",
          legend.text = c("Winter", "Spring", "Summer", "Fall"),
          main = "Computer Science PhD Graduates", las = 1)

# The Original (Metaphorical) Colors (Ouch!)
csphd(c("blue", "green", "yellow", "orange"))

# A Color Tetrad (Maximal Color Differences)
csphd(hcl(h = c(30, 120, 210, 300)))

# Same, but lighter and less colorful
# Turn off automatic correction to make sure
# that we have defined real colors.
csphd(hcl(h = c(30, 120, 210, 300),
          c = 20, l = 90, fixup = FALSE))

# Analogous Colors
# Good for those with red/green color confusion
csphd(hcl(h = seq(60, 240, by = 60)))

# Metaphorical Colors
csphd(hcl(h = seq(210, 60, length.out = 4)))

# Cool Colors
csphd(hcl(h = seq(120, 0, length.out = 4) + 150))

# Warm Colors
csphd(hcl(h = seq(120, 0, length.out = 4) - 30))

# Single Color
hist(stats::rnorm(1000), col = hcl(240))

## Exploring the hcl() color space {in its mapping to R's sRGB colors}:
demo(hclColors)




cleanEx()
nameEx("hsv")
### * hsv

flush(stderr()); flush(stdout())

### Name: hsv
### Title: HSV Color Specification
### Aliases: hsv
### Keywords: color dplot

### ** Examples

require(graphics)

hsv(.5,.5,.5)

## Red tones:
n <- 20;  y <- -sin(3*pi*((1:n)-1/2)/n)
op <- par(mar = rep(1.5, 4))
plot(y, axes = FALSE, frame.plot = TRUE,
     xlab = "", ylab = "", pch = 21, cex = 30,
     bg = rainbow(n, start = .85, end = .1),
     main = "Red tones")
par(op)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("make.rgb")
### * make.rgb

flush(stderr()); flush(stdout())

### Name: make.rgb
### Title: Create colour spaces
### Aliases: make.rgb colorConverter
### Keywords: color

### ** Examples

(pal <- make.rgb(red =   c(0.6400, 0.3300),
                 green = c(0.2900, 0.6000),
                 blue =  c(0.1500, 0.0600),
                 name = "PAL/SECAM RGB"))

## converter for sRGB in #rrggbb format
hexcolor <- colorConverter(toXYZ = function(hex, ...) {
                            rgb <- t(col2rgb(hex))/255
                            colorspaces$sRGB$toXYZ(rgb, ...) },
                           fromXYZ = function(xyz, ...) {
                              rgb <- colorspaces$sRGB$fromXYZ(xyz, ...)
                              rgb <- round(rgb, 5)
                              if (min(rgb) < 0 || max(rgb) > 1)
                                   as.character(NA)
                              else rgb(rgb[1], rgb[2], rgb[3])},
                           white = "D65", name = "#rrggbb")

(cols <- t(col2rgb(palette())))
zapsmall(luv <- convertColor(cols, from = "sRGB", to = "Luv", scale.in = 255))
(hex <- convertColor(luv, from = "Luv",  to = hexcolor, scale.out = NULL))

## must make hex a matrix before using it
(cc <- round(convertColor(as.matrix(hex), from = hexcolor, to = "sRGB",
                          scale.in = NULL, scale.out = 255)))
stopifnot(cc == cols)

## Internally vectorized version of hexcolor, notice the use
## of `vectorized = TRUE`:

hexcolorv <- colorConverter(toXYZ = function(hex, ...) {
                            rgb <- t(col2rgb(hex))/255
                            colorspaces$sRGB$toXYZ(rgb, ...) },
                           fromXYZ = function(xyz, ...) {
                              rgb <- colorspaces$sRGB$fromXYZ(xyz, ...)
                              rgb <- round(rgb, 5)
                              oob <- pmin(rgb[,1],rgb[,2],rgb[,3]) < 0 |
                                     pmax(rgb[,1],rgb[,2],rgb[,3]) > 0
                              res <- rep(NA_character_, nrow(rgb))
                              res[!oob] <- rgb(rgb[!oob,,drop=FALSE])},
                           white = "D65", name = "#rrggbb",
                           vectorized=TRUE)
(ccv <- round(convertColor(as.matrix(hex), from = hexcolor, to = "sRGB",
                           scale.in = NULL, scale.out = 255)))
stopifnot(ccv == cols)




cleanEx()
nameEx("n2mfrow")
### * n2mfrow

flush(stderr()); flush(stdout())

### Name: n2mfrow
### Title: Compute Default 'mfrow' From Number of Plots
### Aliases: n2mfrow
### Keywords: dplot utilities

### ** Examples

require(graphics)

n2mfrow(8) # 3 x 3

n <- 5 ; x <- seq(-2, 2, length.out = 51)
## suppose now that 'n' is not known {inside function}
op <- par(mfrow = n2mfrow(n))
for (j in 1:n)
   plot(x, x^j, main = substitute(x^ exp, list(exp = j)), type = "l",
   col = "blue")

sapply(1:14, n2mfrow)
sapply(1:14, n2mfrow, asp=16/9)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("nclass")
### * nclass

flush(stderr()); flush(stdout())

### Name: nclass
### Title: Compute the Number of Classes for a Histogram
### Aliases: nclass.Sturges nclass.scott nclass.FD
### Keywords: univar

### ** Examples

set.seed(1)
x <- stats::rnorm(1111)
nclass.Sturges(x)

## Compare them:
NC <- function(x) c(Sturges = nclass.Sturges(x),
      Scott = nclass.scott(x), FD = nclass.FD(x))
NC(x)
onePt <- rep(1, 11)
NC(onePt) # no longer gives NaN



cleanEx()
nameEx("palette")
### * palette

flush(stderr()); flush(stdout())

### Name: palette
### Title: Set or View the Graphics Palette
### Aliases: palette palette.pals palette.colors
### Keywords: color sysdata

### ** Examples

require(graphics)

palette()               # obtain the current palette
palette("R3");palette() # old default palette
palette("ggplot2")      # ggplot2-style palette
palette()

palette(hcl.colors(8, "viridis"))

(palette(gray(seq(0,.9,length.out = 25)))) # gray scales; print old palette
matplot(outer(1:100, 1:30), type = "l", lty = 1,lwd = 2, col = 1:30,
        main = "Gray Scales Palette",
        sub = "palette(gray(seq(0, .9, len=25)))")
palette("default")      # reset back to the default

## on a device where alpha transparency is supported,
##  use 'alpha = 0.3' transparency with the default palette :
mycols <- adjustcolor(palette(), alpha.f = 0.3)
opal <- palette(mycols)
x <- rnorm(1000); xy <- cbind(x, 3*x + rnorm(1000))
plot (xy, lwd = 2,
       main = "Alpha-Transparency Palette\n alpha = 0.3")
xy[,1] <- -xy[,1]
points(xy, col = 8, pch = 16, cex = 1.5)
palette("default")

## List available built-in palettes
palette.pals()

## Demonstrate the colors 1:8 in different palettes using a custom matplot()
sinplot <- function(main=NULL) {
    x <- outer(
	seq(-pi, pi, length.out = 50),
	seq(0, pi, length.out = 8),
	function(x, y) sin(x - y)
    )
    matplot(x, type = "l", lwd = 4, lty = 1, col = 1:8, ylab = "", main=main)
}
sinplot("default palette")

palette("R3");        sinplot("R3")
palette("Okabe-Ito"); sinplot("Okabe-Ito")
palette("Tableau")  ; sinplot("Tableau")
palette("default") # reset

## color swatches for palette.colors()
palette.swatch <- function(palette = palette.pals(), n = 8, nrow = 8,
                           border = "black", cex = 1, ...)
{
     cols <- sapply(palette, palette.colors, n = n, recycle = TRUE)
     ncol <- ncol(cols)
     nswatch <- min(ncol, nrow)
     op <- par(mar = rep(0.1, 4),
               mfrow = c(1, min(5, ceiling(ncol/nrow))),
     	       cex = cex, ...)
     on.exit(par(op))
     while (length(palette)) {
 	subset <- seq_len(min(nrow, ncol(cols)))
 	plot.new()
 	plot.window(c(0, n), c(0.25, nrow + 0.25))
 	y <- rev(subset)
 	text(0, y + 0.1, palette[subset], adj = c(0, 0))
 	y <- rep(y, each = n)
 	rect(rep(0:(n-1), n), y, rep(1:n, n), y - 0.5,
 	     col = cols[, subset], border = border)
 	palette <- palette[-subset]
 	cols    <- cols [, -subset, drop = FALSE]
     }
}

palette.swatch()

palette.swatch(n = 26) # show full "Alphabet"; recycle most others



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("palettes")
### * palettes

flush(stderr()); flush(stdout())

### Name: Palettes
### Title: Color Palettes
### Aliases: rainbow heat.colors terrain.colors topo.colors cm.colors
###   hcl.colors hcl.pals
### Keywords: color dplot

### ** Examples

require("graphics")

# color wheels in RGB/HSV and HCL space
par(mfrow = c(2, 2))
pie(rep(1, 12), col = rainbow(12), main = "RGB/HSV")
pie(rep(1, 12), col = hcl.colors(12, "Set 2"), main = "HCL")
par(mfrow = c(1, 1))

## color swatches for RGB/HSV palettes
demo.pal <-
  function(n, border = if (n < 32) "light gray" else NA,
           main = paste("color palettes;  n=", n),
           ch.col = c("rainbow(n, start=.7, end=.1)", "heat.colors(n)",
                      "terrain.colors(n)", "topo.colors(n)",
                      "cm.colors(n)"))
{
    nt <- length(ch.col)
    i <- 1:n; j <- n / nt; d <- j/6; dy <- 2*d
    plot(i, i+d, type = "n", yaxt = "n", ylab = "", main = main)
    for (k in 1:nt) {
        rect(i-.5, (k-1)*j+ dy, i+.4, k*j,
             col = eval(str2lang(ch.col[k])), border = border)
        text(2*j,  k * j + dy/4, ch.col[k])
    }
}
demo.pal(16)

## color swatches for HCL palettes
hcl.swatch <- function(type = NULL, n = 5, nrow = 11,
  border = if (n < 15) "black" else NA) {
    palette <- hcl.pals(type)
    cols <- sapply(palette, hcl.colors, n = n)
    ncol <- ncol(cols)
    nswatch <- min(ncol, nrow)

    par(mar = rep(0.1, 4),
        mfrow = c(1, min(5, ceiling(ncol/nrow))),
        pin = c(1, 0.5 * nswatch),
        cex = 0.7)

    while (length(palette)) {
        subset <- 1:min(nrow, ncol(cols))
        plot.new()
        plot.window(c(0, n), c(0, nrow + 1))
        text(0, rev(subset) + 0.1, palette[subset], adj = c(0, 0))
        y <- rep(subset, each = n)
        rect(rep(0:(n-1), n), rev(y), rep(1:n, n), rev(y) - 0.5,
             col = cols[, subset], border = border)
        palette <- palette[-subset]
        cols <- cols[, -subset, drop = FALSE]
    }

    par(mfrow = c(1, 1), mar = c(5.1, 4.1, 4.1, 2.1), cex = 1)
}
hcl.swatch()
hcl.swatch("qualitative")
hcl.swatch("sequential")
hcl.swatch("diverging")
hcl.swatch("divergingx")

## heat maps with sequential HCL palette (purple)
image(volcano, col = hcl.colors(11, "purples", rev = TRUE))
filled.contour(volcano, nlevels = 10,
               color.palette = function(n, ...)
                   hcl.colors(n, "purples", rev = TRUE, ...))

## list available HCL color palettes
hcl.pals("qualitative")
hcl.pals("sequential")
hcl.pals("diverging")
hcl.pals("divergingx")



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("pdf")
### * pdf

flush(stderr()); flush(stdout())

### Name: pdf
### Title: PDF Graphics Device
### Aliases: pdf
### Keywords: device

### ** Examples



cleanEx()
nameEx("pdf.options")
### * pdf.options

flush(stderr()); flush(stdout())

### Name: pdf.options
### Title: Auxiliary Function to Set/View Defaults for Arguments of pdf
### Aliases: pdf.options
### Keywords: device

### ** Examples

pdf.options(bg = "pink")
utils::str(pdf.options())
pdf.options(reset = TRUE) # back to factory-fresh



cleanEx()
nameEx("pictex")
### * pictex

flush(stderr()); flush(stdout())

### Name: pictex
### Title: A PicTeX Graphics Driver
### Aliases: pictex
### Keywords: device

### ** Examples

require(graphics)
## Don't show: 
oldwd <- setwd(tempdir())
## End(Don't show)

pictex()
plot(1:11, (-5:5)^2, type = "b", main = "Simple Example Plot")
dev.off()
##--------------------
## Not run: 
##D %% LaTeX Example
##D \documentclass{article}
##D \usepackage{pictex}
##D \usepackage{graphics} % for \rotatebox
##D \begin{document}
##D %...
##D \begin{figure}[h]
##D   \centerline{\input{Rplots.tex}}
##D   \caption{}
##D \end{figure}
##D %...
##D \end{document}
## End(Not run)
##--------------------
unlink("Rplots.tex")
## Don't show: 
setwd(oldwd)
## End(Don't show)



cleanEx()
nameEx("plotmath")
### * plotmath

flush(stderr()); flush(stdout())

### Name: plotmath
### Title: Mathematical Annotation in R
### Aliases: plotmath symbol plain bold italic bolditalic hat bar dot ring
###   widehat widetilde displaystyle textstyle scriptstyle
###   scriptscriptstyle underline phantom over frac atop integral inf sup
###   group bgroup
### Keywords: aplot

### ** Examples

require(graphics)

x <- seq(-4, 4, length.out = 101)
y <- cbind(sin(x), cos(x))
matplot(x, y, type = "l", xaxt = "n",
        main = expression(paste(plain(sin) * phi, "  and  ",
                                plain(cos) * phi)),
        ylab = expression("sin" * phi, "cos" * phi), # only 1st is taken
        xlab = expression(paste("Phase Angle ", phi)),
        col.main = "blue")
axis(1, at = c(-pi, -pi/2, 0, pi/2, pi),
     labels = expression(-pi, -pi/2, 0, pi/2, pi))


## How to combine "math" and numeric variables :
plot(1:10, type="n", xlab="", ylab="", main = "plot math & numbers")
theta <- 1.23 ; mtext(bquote(hat(theta) == .(theta)), line= .25)
for(i in 2:9)
    text(i, i+1, substitute(list(xi, eta) == group("(",list(x,y),")"),
                            list(x = i, y = i+1)))
## note that both of these use calls rather than expressions.
##
text(1, 10,  "Derivatives:", adj = 0)
text(1, 9.6, expression(
 "             first: {f * minute}(x) " == {f * minute}(x)), adj = 0)
text(1, 9.0, expression(
 "     second: {f * second}(x) "        == {f * second}(x)), adj = 0)


plot(1:10, 1:10)
text(4, 9, expression(hat(beta) == (X^t * X)^{-1} * X^t * y))
text(4, 8.4, "expression(hat(beta) == (X^t * X)^{-1} * X^t * y)",
     cex = .8)
text(4, 7, expression(bar(x) == sum(frac(x[i], n), i==1, n)))
text(4, 6.4, "expression(bar(x) == sum(frac(x[i], n), i==1, n))",
     cex = .8)
text(8, 5, expression(paste(frac(1, sigma*sqrt(2*pi)), " ",
                            plain(e)^{frac(-(x-mu)^2, 2*sigma^2)})),
     cex = 1.2)

## some other useful symbols
plot.new(); plot.window(c(0,4), c(15,1))
text(1, 1, "universal", adj = 0); text(2.5, 1,  "\\042")
text(3, 1, expression(symbol("\042")))
text(1, 2, "existential", adj = 0); text(2.5, 2,  "\\044")
text(3, 2, expression(symbol("\044")))
text(1, 3, "suchthat", adj = 0); text(2.5, 3,  "\\047")
text(3, 3, expression(symbol("\047")))
text(1, 4, "therefore", adj = 0); text(2.5, 4,  "\\134")
text(3, 4, expression(symbol("\134")))
text(1, 5, "perpendicular", adj = 0); text(2.5, 5,  "\\136")
text(3, 5, expression(symbol("\136")))
text(1, 6, "circlemultiply", adj = 0); text(2.5, 6,  "\\304")
text(3, 6, expression(symbol("\304")))
text(1, 7, "circleplus", adj = 0); text(2.5, 7,  "\\305")
text(3, 7, expression(symbol("\305")))
text(1, 8, "emptyset", adj = 0); text(2.5, 8,  "\\306")
text(3, 8, expression(symbol("\306")))
text(1, 9, "angle", adj = 0); text(2.5, 9,  "\\320")
text(3, 9, expression(symbol("\320")))
text(1, 10, "leftangle", adj = 0); text(2.5, 10,  "\\341")
text(3, 10, expression(symbol("\341")))
text(1, 11, "rightangle", adj = 0); text(2.5, 11,  "\\361")
text(3, 11, expression(symbol("\361")))



cleanEx()
nameEx("postscriptFonts")
### * postscriptFonts

flush(stderr()); flush(stdout())

### Name: postscriptFonts
### Title: PostScript and PDF Font Families
### Aliases: postscriptFonts pdfFonts
### Keywords: device

### ** Examples

postscriptFonts()
## This duplicates "ComputerModernItalic".
CMitalic <- Type1Font("ComputerModern2",
                      c("CM_regular_10.afm", "CM_boldx_10.afm",
                        "cmti10.afm", "cmbxti10.afm",
                         "CM_symbol_10.afm"),
                      encoding = "TeXtext.enc")
postscriptFonts(CMitalic = CMitalic)

## A CID font for Japanese using a different CMap and
## corresponding cmapEncoding.
`Jp_UCS-2` <- CIDFont("TestUCS2",
                  c("Adobe-Japan1-UniJIS-UCS2-H.afm",
                    "Adobe-Japan1-UniJIS-UCS2-H.afm",
                    "Adobe-Japan1-UniJIS-UCS2-H.afm",
                    "Adobe-Japan1-UniJIS-UCS2-H.afm"),
                  "UniJIS-UCS2-H", "UCS-2")
pdfFonts(`Jp_UCS-2` = `Jp_UCS-2`)
names(pdfFonts())



cleanEx()
nameEx("pretty.Date")
### * pretty.Date

flush(stderr()); flush(stdout())

### Name: pretty.Date
### Title: Pretty Breakpoints for Date-Time Classes
### Aliases: pretty.Date pretty.POSIXt
### Keywords: dplot

### ** Examples

## time-dependent ==> ignore diffs:
## IGNORE_RDIFF_BEGIN
pretty(Sys.Date())
pretty(Sys.time(), n = 10)
## IGNORE_RDIFF_END

pretty(as.Date("2000-03-01")) # R 1.0.0 came in a leap year

## time ranges in diverse scales:% also in ../../../../tests/reg-tests-1c.R
require(stats)
steps <- setNames(,
    c("10 secs", "1 min", "5 mins", "30 mins", "6 hours", "12 hours",
      "1 DSTday", "2 weeks", "1 month", "6 months", "1 year",
      "10 years", "50 years", "1000 years"))
x <- as.POSIXct("2002-02-02 02:02")
lapply(steps,
       function(s) {
           at <- pretty(seq(x, by = s, length.out = 2), n = 5)
           attr(at, "labels")
       })



cleanEx()
nameEx("ps.options")
### * ps.options

flush(stderr()); flush(stdout())

### Name: ps.options
### Title: Auxiliary Function to Set/View Defaults for Arguments of
###   postscript
### Aliases: ps.options setEPS setPS
### Keywords: device

### ** Examples

ps.options(bg = "pink")
utils::str(ps.options())

### ---- error checking of arguments: ----
ps.options(width = 0:12, onefile = 0, bg = pi)
# override the check for 'width', but not 'bg':
ps.options(width = 0:12, bg = pi, override.check = c(TRUE,FALSE))
utils::str(ps.options())
ps.options(reset = TRUE) # back to factory-fresh



cleanEx()
nameEx("quartz")
### * quartz

flush(stderr()); flush(stdout())

### Name: quartz
### Title: macOS Quartz Device
### Aliases: quartz quartz.options quartz.save
### Keywords: device

### ** Examples
## Not run: 
##D ## Only on a Mac,
##D ## put something like this is your .Rprofile to customize the defaults
##D setHook(packageEvent("grDevices", "onLoad"),
##D         function(...) grDevices::quartz.options(width = 8, height = 6,
##D                                                 pointsize = 10))
## End(Not run)


cleanEx()
nameEx("quartzFonts")
### * quartzFonts

flush(stderr()); flush(stdout())

### Name: quartzFonts
### Title: Quartz Fonts Setup
### Aliases: quartzFont quartzFonts
### Keywords: device

### ** Examples

if(.Platform$OS.type == "unix") { # includes Mac

 utils::str( quartzFonts() ) # a list(serif = .., sans = .., mono = ..)
 quartzFonts("mono") # the list(mono = ..) sublist of quartzFonts()
## Not run: 
##D   ## for East Asian locales you can use something like
##D   quartzFonts(sans = quartzFont(rep("AppleGothic", 4)),
##D 	      serif = quartzFont(rep("AppleMyungjp", 4)))
##D   ## since the default fonts may well not have the glyphs needed
## End(Not run)
}



cleanEx()
nameEx("recordGraphics")
### * recordGraphics

flush(stderr()); flush(stdout())

### Name: recordGraphics
### Title: Record Graphics Operations
### Aliases: recordGraphics
### Keywords: device

### ** Examples

require(graphics)

plot(1:10)
# This rectangle remains 1inch wide when the device is resized
recordGraphics(
  {
    rect(4, 2,
         4 + diff(par("usr")[1:2])/par("pin")[1], 3)
  },
  list(),
  getNamespace("graphics"))



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("rgb")
### * rgb

flush(stderr()); flush(stdout())

### Name: rgb
### Title: RGB Color Specification
### Aliases: rgb
### Keywords: color

### ** Examples

rgb(0, 1, 0)

rgb((0:15)/15, green = 0, blue = 0, names = paste("red", 0:15, sep = "."))

rgb(0, 0:12, 0, maxColorValue = 255) # integer input

ramp <- colorRamp(c("red", "white"))
rgb( ramp(seq(0, 1, length.out = 5)), maxColorValue = 255)



cleanEx()
nameEx("rgb2hsv")
### * rgb2hsv

flush(stderr()); flush(stdout())

### Name: rgb2hsv
### Title: RGB to HSV Conversion
### Aliases: rgb2hsv
### Keywords: color dplot

### ** Examples

## These (saturated, bright ones) only differ by hue
(rc <- col2rgb(c("red", "yellow","green","cyan", "blue", "magenta")))
(hc <- rgb2hsv(rc))
6 * hc["h",] # the hues are equispaced

## Don't show: 
set.seed(151)
## End(Don't show)
(rgb3 <- floor(256 * matrix(stats::runif(3*12), 3, 12)))
(hsv3 <- rgb2hsv(rgb3))
## Consistency :
stopifnot(rgb3 == col2rgb(hsv(h = hsv3[1,], s = hsv3[2,], v = hsv3[3,])),
          all.equal(hsv3, rgb2hsv(rgb3/255, maxColorValue = 1)))

## A (simplified) pure R version -- originally by Wolfram Fischer --
## showing the exact algorithm:
rgb2hsvR <- function(rgb, gamma = 1, maxColorValue = 255)
{
    if(!is.numeric(rgb)) stop("rgb matrix must be numeric")
    d <- dim(rgb)
    if(d[1] != 3) stop("rgb matrix must have 3 rows")
    n <- d[2]
    if(n == 0) return(cbind(c(h = 1, s = 1, v = 1))[,0])
    rgb <- rgb/maxColorValue
    if(gamma != 1) rgb <- rgb ^ (1/gamma)

    ## get the max and min
    v <- apply( rgb, 2, max)
    s <- apply( rgb, 2, min)
    D <- v - s # range

    ## set hue to zero for undefined values (gray has no hue)
    h <- numeric(n)
    notgray <- ( s != v )

    ## blue hue
    idx <- (v == rgb[3,] & notgray )
    if (any (idx))
        h[idx] <- 2/3 + 1/6 * (rgb[1,idx] - rgb[2,idx]) / D[idx]
    ## green hue
    idx <- (v == rgb[2,] & notgray )
    if (any (idx))
        h[idx] <- 1/3 + 1/6 * (rgb[3,idx] - rgb[1,idx]) / D[idx]
    ## red hue
    idx <- (v == rgb[1,] & notgray )
    if (any (idx))
        h[idx] <-       1/6 * (rgb[2,idx] - rgb[3,idx]) / D[idx]

    ## correct for negative red
    idx <- (h < 0)
    h[idx] <- 1+h[idx]

    ## set the saturation
    s[! notgray] <- 0;
    s[notgray] <- 1 - s[notgray] / v[notgray]

    rbind( h = h, s = s, v = v )
}

## confirm the equivalence:
all.equal(rgb2hsv (rgb3),
          rgb2hsvR(rgb3), tolerance = 1e-14) # TRUE



cleanEx()
nameEx("trans3d")
### * trans3d

flush(stderr()); flush(stdout())

### Name: trans3d
### Title: 3D to 2D Transformation for Perspective Plots
### Aliases: trans3d
### Keywords: dplot

### ** Examples

## See  help(persp) {after attaching the 'graphics' package}
##      -----------



cleanEx()
nameEx("windows")
### * windows

flush(stderr()); flush(stdout())

### Name: windows
### Title: Windows Graphics Devices
### Aliases: windows win.graph win.metafile win.print print.SavedPlots
###   [.SavedPlots
### Keywords: device

### ** Examples
## Not run: 
##D ## A series of plots written to a sequence of metafiles
##D if(.Platform$OS.type == "windows")
##D    win.metafile("Rplot%02d.wmf", pointsize = 10)
## End(Not run)


cleanEx()
nameEx("windows.options")
### * windows.options

flush(stderr()); flush(stdout())

### Name: windows.options
### Title: Auxiliary Function to Set/View Defaults for Arguments of
###   windows()
### Aliases: windows.options
### Keywords: device

### ** Examples
## Not run: 
##D ## put something like this is your .Rprofile to customize the defaults
##D setHook(packageEvent("grDevices", "onLoad"),
##D         function(...)
##D             grDevices::windows.options(width = 8, height = 6,
##D                                        xpos = 0, pointsize = 10,
##D                                        bitmap.aa.win = "cleartype"))
## End(Not run)


cleanEx()
nameEx("windowsFonts")
### * windowsFonts

flush(stderr()); flush(stdout())

### Name: windowsFonts
### Title: Windows Fonts
### Aliases: windowsFont windowsFonts
### Keywords: device

### ** Examples

if(.Platform$OS.type == "windows") withAutoprint({
  windowsFonts()
  windowsFonts("mono")
})
## Not run: 
##D ## set up for Japanese: needs the fonts installed
##D windows()  # make sure we have the right device type (available on Windows only)
##D Sys.setlocale("LC_ALL", "ja")
##D windowsFonts(JP1 = windowsFont("MS Mincho"),
##D              JP2 = windowsFont("MS Gothic"),
##D              JP3 = windowsFont("Arial Unicode MS"))
##D plot(1:10)
##D text(5, 2, "\u{4E10}\u{4E00}\u{4E01}", family = "JP1")
##D text(7, 2, "\u{4E10}\u{4E00}\u{4E01}", family = "JP1", font = 2)
##D text(5, 1.5, "\u{4E10}\u{4E00}\u{4E01}", family = "JP2")
##D text(9, 2, "\u{5100}", family = "JP3")
## End(Not run)


cleanEx()
nameEx("x11")
### * x11

flush(stderr()); flush(stdout())

### Name: x11
### Title: X Window System Graphics (X11)
### Aliases: x11 X11 X11.options
### Keywords: device

### ** Examples
## Not run: 
##D if(.Platform$OS.type == "unix") { # Only on unix-alikes, possibly Mac,
##D ## put something like this is your .Rprofile to customize the defaults
##D setHook(packageEvent("grDevices", "onLoad"),
##D         function(...) grDevices::X11.options(width = 8, height = 6, xpos = 0,
##D                                              pointsize = 10))
##D }
## End(Not run)


cleanEx()
nameEx("x11Fonts")
### * x11Fonts

flush(stderr()); flush(stdout())

### Name: X11Fonts
### Title: X11 Fonts
### Aliases: X11Font X11Fonts
### Keywords: device

### ** Examples

## IGNORE_RDIFF_BEGIN
if(capabilities()[["X11"]]) withAutoprint({
X11Fonts()
X11Fonts("mono")
utopia <- X11Font("-*-utopia-*-*-*-*-*-*-*-*-*-*-*-*")
X11Fonts(utopia = utopia)
})
## IGNORE_RDIFF_END



cleanEx()
nameEx("xy.coords")
### * xy.coords

flush(stderr()); flush(stdout())

### Name: xy.coords
### Title: Extracting Plotting Structures
### Aliases: xy.coords
### Keywords: dplot

### ** Examples

ff <- stats::fft(1:9)
xy.coords(ff)
xy.coords(ff, xlab = "fft") # labels "Re(fft)",  "Im(fft)"
## Don't show: 
stopifnot(identical(xy.coords(ff, xlab = "fft"),
                    xy.coords(ff, ylab = "fft")))
xy.labs <- function(...) xy.coords(...)[c("xlab","ylab")]
stopifnot(identical(xy.labs(ff, xlab = "fft", setLab = FALSE),
                    list(xlab = "fft", ylab = "fft")),
          identical(xy.labs(ff, ylab = "fft", setLab = FALSE),
                    list(xlab = NULL, ylab = "fft")),
          identical(xy.labs(ff, xlab = "Re(fft)", ylab = "Im(fft)", setLab = FALSE),
                    list(xlab = "Re(fft)", ylab = "Im(fft)")))
## End(Don't show)
with(cars, xy.coords(dist ~ speed, NULL)$xlab ) # = "speed"

xy.coords(1:3, 1:2, recycle = TRUE) # otherwise error "lengths differ"
xy.coords(-2:10, log = "y")
##> xlab: "Index"  \\  warning: 3 y values <= 0 omitted ..



cleanEx()
nameEx("xyTable")
### * xyTable

flush(stderr()); flush(stdout())

### Name: xyTable
### Title: Multiplicities of (x,y) Points, e.g., for a Sunflower Plot
### Aliases: xyTable
### Keywords: dplot

### ** Examples

xyTable(iris[, 3:4], digits = 6)

## Discretized uncorrelated Gaussian:
## Don't show: 
set.seed(1)
## End(Don't show)
require(stats)
xy <- data.frame(x = round(sort(rnorm(100))), y = rnorm(100))
xyTable(xy, digits = 1)



cleanEx()
nameEx("xyz.coords")
### * xyz.coords

flush(stderr()); flush(stdout())

### Name: xyz.coords
### Title: Extracting Plotting Structures
### Aliases: xyz.coords
### Keywords: dplot

### ** Examples

xyz.coords(data.frame(10*1:9, -4), y = NULL, z = NULL)

xyz.coords(1:5, stats::fft(1:5), z = NULL, xlab = "X", ylab = "Y")

y <- 2 * (x2 <- 10 + (x1 <- 1:10))
xyz.coords(y ~ x1 + x2, y = NULL, z = NULL)

xyz.coords(data.frame(x = -1:9, y = 2:12, z = 3:13), y = NULL, z = NULL,
           log = "xy")
##> Warning message: 2 x values <= 0 omitted ...
