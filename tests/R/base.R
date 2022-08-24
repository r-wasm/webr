pkgname <- "base"
source(file.path(R.home("share"), "R", "examples-header.R"))
options(warn = 1)
base::assign(".oldSearch", base::search(), pos = 'CheckExEnv')
base::assign(".old_wd", base::getwd(), pos = 'CheckExEnv')
cleanEx()
nameEx("Arithmetic")
### * Arithmetic

flush(stderr()); flush(stdout())

### Name: Arithmetic
### Title: Arithmetic Operators
### Aliases: + - * ** / ^ %% %/% Arithmetic
### Keywords: arith

### ** Examples

x <- -1:12
x + 1
2 * x + 3
x %% 2 #-- is periodic
x %/% 5
x %% Inf # now is defined by limit (gave NaN in earlier versions of R)



cleanEx()
nameEx("Bessel")
### * Bessel

flush(stderr()); flush(stdout())

### Name: Bessel
### Title: Bessel Functions
### Aliases: bessel Bessel besselI besselJ besselK besselY
### Keywords: math

### ** Examples

require(graphics)

nus <- c(0:5, 10, 20)

x <- seq(0, 4, length.out = 501)
plot(x, x, ylim = c(0, 6), ylab = "", type = "n",
     main = "Bessel Functions  I_nu(x)")
for(nu in nus) lines(x, besselI(x, nu = nu), col = nu + 2)
legend(0, 6, legend = paste("nu=", nus), col = nus + 2, lwd = 1)

x <- seq(0, 40, length.out = 801); yl <- c(-.5, 1)
plot(x, x, ylim = yl, ylab = "", type = "n",
     main = "Bessel Functions  J_nu(x)")
abline(h=0, v=0, lty=3)
for(nu in nus) lines(x, besselJ(x, nu = nu), col = nu + 2)
legend("topright", legend = paste("nu=", nus), col = nus + 2, lwd = 1, bty="n")

## Negative nu's --------------------------------------------------
xx <- 2:7
nu <- seq(-10, 9, length.out = 2001)
## --- I() --- --- --- ---
matplot(nu, t(outer(xx, nu, besselI)), type = "l", ylim = c(-50, 200),
        main = expression(paste("Bessel ", I[nu](x), " for fixed ", x,
                                ",  as ", f(nu))),
        xlab = expression(nu))
abline(v = 0, col = "light gray", lty = 3)
legend(5, 200, legend = paste("x=", xx), col=seq(xx), lty=1:5)

## --- J() --- --- --- ---
bJ <- t(outer(xx, nu, besselJ))
matplot(nu, bJ, type = "l", ylim = c(-500, 200),
        xlab = quote(nu), ylab = quote(J[nu](x)),
        main = expression(paste("Bessel ", J[nu](x), " for fixed ", x)))
abline(v = 0, col = "light gray", lty = 3)
legend("topright", legend = paste("x=", xx), col=seq(xx), lty=1:5)

## ZOOM into right part:
matplot(nu[nu > -2], bJ[nu > -2,], type = "l",
        xlab = quote(nu), ylab = quote(J[nu](x)),
        main = expression(paste("Bessel ", J[nu](x), " for fixed ", x)))
abline(h=0, v = 0, col = "gray60", lty = 3)
legend("topright", legend = paste("x=", xx), col=seq(xx), lty=1:5)


##---------------  x --> 0  -----------------------------
x0 <- 2^seq(-16, 5, length.out=256)
plot(range(x0), c(1e-40, 1), log = "xy", xlab = "x", ylab = "", type = "n",
     main = "Bessel Functions  J_nu(x)  near 0\n log - log  scale") ; axis(2, at=1)
for(nu in sort(c(nus, nus+0.5)))
    lines(x0, besselJ(x0, nu = nu), col = nu + 2, lty= 1+ (nu%%1 > 0))
legend("right", legend = paste("nu=", paste(nus, nus+0.5, sep=", ")),
       col = nus + 2, lwd = 1, bty="n")

x0 <- 2^seq(-10, 8, length.out=256)
plot(range(x0), 10^c(-100, 80), log = "xy", xlab = "x", ylab = "", type = "n",
     main = "Bessel Functions  K_nu(x)  near 0\n log - log  scale") ; axis(2, at=1)
for(nu in sort(c(nus, nus+0.5)))
    lines(x0, besselK(x0, nu = nu), col = nu + 2, lty= 1+ (nu%%1 > 0))
legend("topright", legend = paste("nu=", paste(nus, nus + 0.5, sep = ", ")),
       col = nus + 2, lwd = 1, bty="n")

x <- x[x > 0]
plot(x, x, ylim = c(1e-18, 1e11), log = "y", ylab = "", type = "n",
     main = "Bessel Functions  K_nu(x)"); axis(2, at=1)
for(nu in nus) lines(x, besselK(x, nu = nu), col = nu + 2)
legend(0, 1e-5, legend=paste("nu=", nus), col = nus + 2, lwd = 1)

yl <- c(-1.6, .6)
plot(x, x, ylim = yl, ylab = "", type = "n",
     main = "Bessel Functions  Y_nu(x)")
for(nu in nus){
    xx <- x[x > .6*nu]
    lines(xx, besselY(xx, nu=nu), col = nu+2)
}
legend(25, -.5, legend = paste("nu=", nus), col = nus+2, lwd = 1)

## negative nu in bessel_Y -- was bogus for a long time
curve(besselY(x, -0.1), 0, 10, ylim = c(-3,1), ylab = "")
for(nu in c(seq(-0.2, -2, by = -0.1)))
  curve(besselY(x, nu), add = TRUE)
title(expression(besselY(x, nu) * "   " *
                 {nu == list(-0.1, -0.2, ..., -2)}))



cleanEx()
nameEx("Colon")
### * Colon

flush(stderr()); flush(stdout())

### Name: Colon
### Title: Colon Operator
### Aliases: : colon
### Keywords: manip

### ** Examples

1:4
pi:6 # real
6:pi # integer

f1 <- gl(2, 3); f1
f2 <- gl(3, 2); f2
f1:f2 # a factor, the "cross"  f1 x f2



cleanEx()
nameEx("Comparison")
### * Comparison

flush(stderr()); flush(stdout())

### Name: Comparison
### Title: Relational Operators
### Aliases: < <= == != >= > Comparison collation
### Keywords: logic

### ** Examples

x <- stats::rnorm(20)
x < 1
x[x > 0]

x1 <- 0.5 - 0.3
x2 <- 0.3 - 0.1
x1 == x2                   # FALSE on most machines
isTRUE(all.equal(x1, x2))  # TRUE everywhere



cleanEx()
nameEx("Constants")
### * Constants

flush(stderr()); flush(stdout())

### Name: Constants
### Title: Built-in Constants
### Aliases: Constants LETTERS letters month.abb month.name pi
### Keywords: sysdata

### ** Examples

## John Machin (ca 1706) computed pi to over 100 decimal places
## using the Taylor series expansion of the second term of
pi - 4*(4*atan(1/5) - atan(1/239))

## months in English
month.name
## months in your current locale
format(ISOdate(2000, 1:12, 1), "%B")
format(ISOdate(2000, 1:12, 1), "%b")



cleanEx()
nameEx("Control")
### * Control

flush(stderr()); flush(stdout())

### Name: Control
### Title: Control Flow
### Aliases: Control if else for in while repeat break next
### Keywords: programming iteration logic

### ** Examples

for(i in 1:5) print(1:i)
for(n in c(2,5,10,20,50)) {
   x <- stats::rnorm(n)
   cat(n, ": ", sum(x^2), "\n", sep = "")
}
f <- factor(sample(letters[1:5], 10, replace = TRUE))
for(i in unique(f)) print(i)



cleanEx()
nameEx("Cstack_info")
### * Cstack_info

flush(stderr()); flush(stdout())

### Name: Cstack_info
### Title: Report Information on C Stack Size and Usage
### Aliases: Cstack_info
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("DateTimeClasses")
### * DateTimeClasses

flush(stderr()); flush(stdout())

### Name: DateTimeClasses
### Title: Date-Time Classes
### Aliases: DateTimeClasses POSIXct POSIXlt POSIXt print.POSIXct
###   print.POSIXlt summary.POSIXct summary.POSIXlt +.POSIXt -.POSIXt
###   Ops.POSIXt Math.POSIXt Summary.POSIXct Math.POSIXlt Summary.POSIXlt
###   [.POSIXct [<-.POSIXct [[.POSIXct [.POSIXlt [<-.POSIXlt [[.POSIXlt
###   [[<-.POSIXlt as.data.frame.POSIXct as.data.frame.POSIXlt
###   as.list.POSIXct as.list.POSIXlt .leap.seconds anyNA.POSIXlt
###   is.na.POSIXlt c.POSIXct c.POSIXlt as.matrix.POSIXlt length.POSIXlt
###   length<-.POSIXct length<-.POSIXlt mean.POSIXct mean.POSIXlt
###   str.POSIXt check_tzones duplicated.POSIXlt unique.POSIXlt
###   split.POSIXct names.POSIXlt names<-.POSIXlt date-time
### Keywords: utilities chron

### ** Examples

## IGNORE_RDIFF_BEGIN
(z <- Sys.time())             # the current date, as class "POSIXct"

Sys.time() - 3600             # an hour ago

as.POSIXlt(Sys.time(), "GMT") # the current time in GMT
format(.leap.seconds)         # the leap seconds in your time zone
print(.leap.seconds, tz = "PST8PDT")  # and in Seattle's
## IGNORE_RDIFF_END

## look at *internal* representation of "POSIXlt" :
leapS <- as.POSIXlt(.leap.seconds)
names(leapS) ; is.list(leapS)
## str() "too smart" -->  need unclass(.):
utils::str(unclass(leapS), vec.len = 7)
## Extracting *single* components of POSIXlt objects:
leapS[1 : 5, "year"]

##  length(.) <- n   now works for "POSIXct" and "POSIXlt" :
for(lpS in list(.leap.seconds, leapS)) {
    ls <- lpS; length(ls) <- 12
    l2 <- lpS; length(l2) <- 5 + length(lpS)
    stopifnot(exprs = {
      ## length(.) <- * is compatible to subsetting/indexing:
      identical(ls, lpS[seq_along(ls)])
      identical(l2, lpS[seq_along(l2)])
      ## has filled with NA's
      is.na(l2[(length(lpS)+1):length(l2)])
    })
}



cleanEx()
nameEx("Dates")
### * Dates

flush(stderr()); flush(stdout())

### Name: Dates
### Title: Date Class
### Aliases: Date Dates print.Date summary.Date Math.Date Summary.Date
###   [.Date [<-.Date length<-.Date [[.Date as.data.frame.Date as.list.Date
###   c.Date mean.Date split.Date
### Keywords: utilities chron

### ** Examples
(Dls <- as.Date(.leap.seconds))

##  length(<Date>) <- n   now works
ls <- Dls; length(ls) <- 12
l2 <- Dls; length(l2) <- 5 + length(Dls)
stopifnot(exprs = {
  ## length(.) <- * is compatible to subsetting/indexing:
  identical(ls, Dls[seq_along(ls)])
  identical(l2, Dls[seq_along(l2)])
  ## has filled with NA's
  is.na(l2[(length(Dls)+1):length(l2)])
})



cleanEx()
nameEx("Encoding")
### * Encoding

flush(stderr()); flush(stdout())

### Name: Encoding
### Title: Read or Set the Declared Encodings for a Character Vector
### Aliases: Encoding Encoding<- enc2native enc2utf8
### Keywords: utilities character

### ** Examples

## x is intended to be in latin1
x. <- x <- "fa\xE7ile"
Encoding(x.) # "unknown" (UTF-8 loc.) | "latin1" (8859-1/CP-1252 loc.) | ....
Encoding(x) <- "latin1"
x
xx <- iconv(x, "latin1", "UTF-8")
Encoding(c(x., x, xx))
c(x, xx)
xb <- xx; Encoding(xb) <- "bytes"
xb # will be encoded in hex
cat("x = ", x, ", xx = ", xx, ", xb = ", xb, "\n", sep = "")
(Ex <- Encoding(c(x.,x,xx,xb)))
stopifnot(identical(Ex, c(Encoding(x.), Encoding(x),
                          Encoding(xx), Encoding(xb))))



cleanEx()
nameEx("Extract")
### * Extract

flush(stderr()); flush(stdout())

### Name: Extract
### Title: Extract or Replace Parts of an Object
### Aliases: Extract Subscript [ [.listof [.simple.list [.Dlist [[ $
###   getElement [<- [[<- $<-
### Keywords: array list

### ** Examples

x <- 1:12
m <- matrix(1:6, nrow = 2, dimnames = list(c("a", "b"), LETTERS[1:3]))
li <- list(pi = pi, e = exp(1))
x[10]                 # the tenth element of x
x <- x[-1]            # delete the 1st element of x
m[1,]                 # the first row of matrix m
m[1, , drop = FALSE]  # is a 1-row matrix
m[,c(TRUE,FALSE,TRUE)]# logical indexing
m[cbind(c(1,2,1),3:1)]# matrix numeric index
ci <- cbind(c("a", "b", "a"), c("A", "C", "B"))
m[ci]                 # matrix character index
m <- m[,-1]           # delete the first column of m
li[[1]]               # the first element of list li
y <- list(1, 2, a = 4, 5)
y[c(3, 4)]            # a list containing elements 3 and 4 of y
y$a                   # the element of y named a

## non-integer indices are truncated:
(i <- 3.999999999) # "4" is printed
(1:5)[i]  # 3

## named atomic vectors, compare "[" and "[[" :
nx <- c(Abc = 123, pi = pi)
nx[1] ; nx["pi"] # keeps names, whereas "[[" does not:
nx[[1]] ; nx[["pi"]]
## Don't show: 
stopifnot(identical(names(nx[1]), "Abc"),
        identical(names(nx["pi"]), "pi"),
        is.null(names(nx[["Abc"]])), is.null(names(nx[[2]])))
## End(Don't show)
## recursive indexing into lists
z <- list(a = list(b = 9, c = "hello"), d = 1:5)
unlist(z)
z[[c(1, 2)]]
z[[c(1, 2, 1)]]  # both "hello"
z[[c("a", "b")]] <- "new"
unlist(z)

## check $ and [[ for environments
e1 <- new.env()
e1$a <- 10
e1[["a"]]
e1[["b"]] <- 20
e1$b
ls(e1)

## partial matching - possibly with warning :
stopifnot(identical(li$p, pi))
op <- options(warnPartialMatchDollar = TRUE)
stopifnot( identical(li$p, pi), #-- a warning
  inherits(tryCatch (li$p, warning = identity), "warning"))
## revert the warning option:
if(is.null(op[[1]])) op[[1]] <- FALSE; options(op)



cleanEx()
nameEx("Extract.data.frame")
### * Extract.data.frame

flush(stderr()); flush(stdout())

### Name: Extract.data.frame
### Title: Extract or Replace Parts of a Data Frame
### Aliases: [.data.frame [[.data.frame [<-.data.frame [[<-.data.frame
###   $<-.data.frame
### Keywords: array

### ** Examples

sw <- swiss[1:5, 1:4]  # select a manageable subset

sw[1:3]      # select columns
sw[, 1:3]    # same
sw[4:5, 1:3] # select rows and columns
sw[1]        # a one-column data frame
sw[, 1, drop = FALSE]  # the same
sw[, 1]      # a (unnamed) vector
sw[[1]]      # the same
sw$Fert      # the same (possibly w/ warning, see ?Extract)

sw[1,]       # a one-row data frame
sw[1,, drop = TRUE]  # a list

sw["C", ] # partially matches
sw[match("C", row.names(sw)), ] # no exact match
try(sw[, "Ferti"]) # column names must match exactly

## Don't show: 
stopifnot(identical(sw[, 1], sw[[1]]),
          identical(sw[, 1][1], 80.2),
          identical(sw[, 1, drop = FALSE], sw[1]),
          is.data.frame(sw[1 ]), dim(sw[1 ]) == c(5, 1),
          is.data.frame(sw[1,]), dim(sw[1,]) == c(1, 4),
          is.list(s1 <- sw[1, , drop = TRUE]), identical(s1$Fertility, 80.2))
tools::assertError(sw[, "Ferti"])
## End(Don't show)
sw[sw$Fertility > 90,] # logical indexing, see also ?subset
sw[c(1, 1:2), ]        # duplicate row, unique row names are created

sw[sw <= 6] <- 6  # logical matrix indexing
sw

## adding a column
sw["new1"] <- LETTERS[1:5]   # adds a character column
sw[["new2"]] <- letters[1:5] # ditto
sw[, "new3"] <- LETTERS[1:5] # ditto
sw$new4 <- 1:5
sapply(sw, class)
sw$new  # -> NULL: no unique partial match
sw$new4 <- NULL              # delete the column
sw
sw[6:8] <- list(letters[10:14], NULL, aa = 1:5)
# update col. 6, delete 7, append
sw

## matrices in a data frame
A <- data.frame(x = 1:3, y = I(matrix(4:9, 3, 2)),
                         z = I(matrix(letters[1:9], 3, 3)))
A[1:3, "y"] # a matrix
A[1:3, "z"] # a matrix
A[, "y"]    # a matrix
stopifnot(identical(colnames(A), c("x", "y", "z")), ncol(A) == 3L,
          identical(A[,"y"], A[1:3, "y"]),
          inherits (A[,"y"], "AsIs"))

## keeping special attributes: use a class with a
## "as.data.frame" and "[" method;
## "avector" := vector that keeps attributes.   Could provide a constructor
##  avector <- function(x) { class(x) <- c("avector", class(x)); x }
as.data.frame.avector <- as.data.frame.vector

`[.avector` <- function(x,i,...) {
  r <- NextMethod("[")
  mostattributes(r) <- attributes(x)
  r
}

d <- data.frame(i = 0:7, f = gl(2,4),
                u = structure(11:18, unit = "kg", class = "avector"))
str(d[2:4, -1]) # 'u' keeps its "unit"
## Don't show: 
stopifnot(identical(d[2:4,-1][,"u"],
                    structure(12:14, unit = "kg", class = "avector")))
## End(Don't show)



cleanEx()
nameEx("Extract.factor")
### * Extract.factor

flush(stderr()); flush(stdout())

### Name: Extract.factor
### Title: Extract or Replace Parts of a Factor
### Aliases: [.factor [<-.factor [[.factor [[<-.factor
### Keywords: category

### ** Examples

## following example(factor)
(ff <- factor(substring("statistics", 1:10, 1:10), levels = letters))
ff[, drop = TRUE]
factor(letters[7:10])[2:3, drop = TRUE]



cleanEx()
nameEx("Extremes")
### * Extremes

flush(stderr()); flush(stdout())

### Name: Extremes
### Title: Maxima and Minima
### Aliases: max min pmax pmin pmax.int pmin.int
### Keywords: univar arith

### ** Examples

require(stats); require(graphics)
 min(5:1, pi) #-> one number
pmin(5:1, pi) #->  5  numbers

x <- sort(rnorm(100));  cH <- 1.35
pmin(cH, quantile(x)) # no names
pmin(quantile(x), cH) # has names
plot(x, pmin(cH, pmax(-cH, x)), type = "b", main =  "Huber's function")

cut01 <- function(x) pmax(pmin(x, 1), 0)
curve(      x^2 - 1/4, -1.4, 1.5, col = 2)
curve(cut01(x^2 - 1/4), col = "blue", add = TRUE, n = 500)
## pmax(), pmin() preserve attributes of *first* argument
D <- diag(x = (3:1)/4) ; n0 <- numeric()
stopifnot(identical(D,  cut01(D) ),
          identical(n0, cut01(n0)),
          identical(n0, cut01(NULL)),
          identical(n0, pmax(3:1, n0, 2)),
          identical(n0, pmax(n0, 4)))



cleanEx()
nameEx("La_library")
### * La_library

flush(stderr()); flush(stdout())

### Name: La_library
### Title: LAPACK Library
### Aliases: La_library
### Keywords: utilities

### ** Examples

La_library()



cleanEx()
nameEx("La_version")
### * La_version

flush(stderr()); flush(stdout())

### Name: La_version
### Title: LAPACK Version
### Aliases: La_version
### Keywords: utilities

### ** Examples

La_version()



cleanEx()
nameEx("Last.value")
### * Last.value

flush(stderr()); flush(stdout())

### Name: Last.value
### Title: Value of Last Evaluated Expression
### Aliases: .Last.value
### Keywords: programming

### ** Examples

## These will not work correctly from example(),
## but they will in make check or if pasted in,
## as example() does not run them at the top level
gamma(1:15)          # think of some intensive calculation...
fac14 <- .Last.value # keep them

library("splines") # returns invisibly
.Last.value    # shows what library(.) above returned
## Don't show: 
detach("package:splines")
## End(Don't show)



cleanEx()
nameEx("Log")
### * Log

flush(stderr()); flush(stdout())

### Name: log
### Title: Logarithms and Exponentials
### Aliases: log logb log10 log2 log1p exp expm1
### Keywords: math

### ** Examples

log(exp(3))
log10(1e7) # = 7

x <- 10^-(1+2*1:9)
cbind(x, log(1+x), log1p(x), exp(x)-1, expm1(x))



cleanEx()
nameEx("Logic")
### * Logic

flush(stderr()); flush(stdout())

### Name: Logic
### Title: Logical Operators
### Aliases: ! & && | || xor Logic isTRUE isFALSE
### Keywords: logic

### ** Examples

y <- 1 + (x <- stats::rpois(50, lambda = 1.5) / 4 - 1)
x[(x > 0) & (x < 1)]    # all x values between 0 and 1
if (any(x == 0) || any(y == 0)) "zero encountered"

## construct truth tables :

x <- c(NA, FALSE, TRUE)
names(x) <- as.character(x)
outer(x, x, `&`) ## AND table
outer(x, x, `|`) ## OR  table



cleanEx()
nameEx("MathFun")
### * MathFun

flush(stderr()); flush(stdout())

### Name: MathFun
### Title: Miscellaneous Mathematical Functions
### Aliases: abs sqrt
### Keywords: math

### ** Examples

require(stats) # for spline
require(graphics)
xx <- -9:9
plot(xx, sqrt(abs(xx)),  col = "red")
lines(spline(xx, sqrt(abs(xx)), n=101), col = "pink")



cleanEx()
nameEx("NA")
### * NA

flush(stderr()); flush(stdout())

### Name: NA
### Title: 'Not Available' / Missing Values
### Aliases: NA NA_integer_ NA_real_ NA_complex_ NA_character_ is.na
###   is.na.data.frame is.na<- is.na<-.default anyNA anyNA.data.frame
###   anyMissing
### Keywords: NA logic manip

### ** Examples

is.na(c(1, NA))        #> FALSE  TRUE
is.na(paste(c(1, NA))) #> FALSE FALSE

(xx <- c(0:4))
is.na(xx) <- c(2, 4)
xx                     #> 0 NA  2 NA  4
anyNA(xx) # TRUE

# Some logical operations do not return NA
c(TRUE, FALSE) & NA
c(TRUE, FALSE) | NA


## anyNA() can work recursively with list()s:
LL <- list(1:5, c(NA, 5:8), c("A","NA"), c("a", NA_character_))
L2 <- LL[c(1,3)]
sapply(LL, anyNA); c(anyNA(LL), anyNA(LL, TRUE))
sapply(L2, anyNA); c(anyNA(L2), anyNA(L2, TRUE))

## ... lists, and hence data frames, too:
dN <- dd <- USJudgeRatings; dN[3,6] <- NA
anyNA(dd) # FALSE
anyNA(dN) # TRUE



cleanEx()
nameEx("NULL")
### * NULL

flush(stderr()); flush(stdout())

### Name: NULL
### Title: The Null Object
### Aliases: NULL as.null as.null.default is.null
### Keywords: attribute manip list sysdata

### ** Examples

is.null(list())     # FALSE (on purpose!)
is.null(pairlist()) # TRUE
is.null(integer(0)) # FALSE
is.null(logical(0)) # FALSE
as.null(list(a = 1, b = "c"))



cleanEx()
nameEx("NumericConstants")
### * NumericConstants

flush(stderr()); flush(stdout())

### Name: NumericConstants
### Title: Numeric Constants
### Aliases: NumericConstants 1L 0x1 1i
### Keywords: documentation

### ** Examples

## You can create numbers using fixed or scientific formatting.
2.1
2.1e10
-2.1E-10

## The resulting objects have class numeric and type double.
class(2.1)
typeof(2.1)

## This holds even if what you typed looked like an integer.
class(2)
typeof(2)

## If you actually wanted integers, use an "L" suffix.
class(2L)
typeof(2L)

## These are equal but not identical
2 == 2L
identical(2, 2L)

## You can write numbers between 0 and 1 without a leading "0"
## (but typically this makes code harder to read)
.1234

sqrt(1i) # remember elementary math?
utils::str(0xA0)
identical(1L, as.integer(1))

## You can combine the "0x" prefix with the "L" suffix :
identical(0xFL, as.integer(15))



cleanEx()
nameEx("Ops.Date")
### * Ops.Date

flush(stderr()); flush(stdout())

### Name: Ops.Date
### Title: Operators on the Date Class
### Aliases: +.Date -.Date Ops.Date
### Keywords: utilities chron

### ** Examples


cleanEx()
nameEx("Paren")
### * Paren

flush(stderr()); flush(stdout())

### Name: Paren
### Title: Parentheses and Braces
### Aliases: Paren ( {
### Keywords: programming

### ** Examples

f <- get("(")
e <- expression(3 + 2 * 4)
identical(f(e), e)

do <- get("{")
do(x <- 3, y <- 2*x-3, 6-x-y); x; y

## note the differences
(2+3)
{2+3; 4+5}
(invisible(2+3))
{invisible(2+3)}



cleanEx()
nameEx("Platform")
### * Platform

flush(stderr()); flush(stdout())

### Name: .Platform
### Title: Platform Specific Variables
### Aliases: .Platform
### Keywords: file utilities

### ** Examples

## Note: this can be done in a system-independent way by dir.exists()
if(.Platform$OS.type == "unix") {
   system.test <- function(...) system(paste("test", ...)) == 0L
   dir.exists2 <- function(dir)
       sapply(dir, function(d) system.test("-d", d))
   dir.exists2(c(R.home(), "/tmp", "~", "/NO")) # > T T T F
}



cleanEx()
nameEx("Primitive")
### * Primitive

flush(stderr()); flush(stdout())

### Name: Primitive
### Title: Look Up a Primitive Function
### Aliases: .Primitive primitive
### Keywords: interface

### ** Examples

mysqrt <- .Primitive("sqrt")
c
.Internal # this one *must* be primitive!
`if` # need backticks



cleanEx()
nameEx("Quotes")
### * Quotes

flush(stderr()); flush(stdout())

### Name: Quotes
### Title: Quotes
### Aliases: Quotes backtick backquote ' " `
### Keywords: documentation

### ** Examples

'single quotes can be used more-or-less interchangeably'
"with double quotes to create character vectors"

## Single quotes inside single-quoted strings need backslash-escaping.
## Ditto double quotes inside double-quoted strings.
##
identical('"It\'s alive!", he screamed.',
          "\"It's alive!\", he screamed.") # same

## Backslashes need doubling, or they have a special meaning.
x <- "In ALGOL, you could do logical AND with /\\."
print(x)      # shows it as above ("input-like")
writeLines(x) # shows it as you like it ;-)

## Single backslashes followed by a letter are used to denote
## special characters like tab(ulator)s and newlines:
x <- "long\tlines can be\nbroken with newlines"
writeLines(x) # see also ?strwrap

## Backticks are used for non-standard variable names.
## (See make.names and ?Reserved for what counts as
## non-standard.)
`x y` <- 1:5
`x y`
d <- data.frame(`1st column` = rchisq(5, 2), check.names = FALSE)
d$`1st column`

## Backslashes followed by up to three numbers are interpreted as
## octal notation for ASCII characters.
"\110\145\154\154\157\40\127\157\162\154\144\41"

## \x followed by up to two numbers is interpreted as
## hexadecimal notation for ASCII characters.
(hw1 <- "\x48\x65\x6c\x6c\x6f\x20\x57\x6f\x72\x6c\x64\x21")

## Mixing octal and hexadecimal in the same string is OK
(hw2 <- "\110\x65\154\x6c\157\x20\127\x6f\162\x6c\144\x21")

## \u is also hexadecimal, but supports up to 4 digits,
## using Unicode specification.  In the previous example,
## you can simply replace \x with \u.
(hw3 <- "\u48\u65\u6c\u6c\u6f\u20\u57\u6f\u72\u6c\u64\u21")

## The last three are all identical to
hw <- "Hello World!"
stopifnot(identical(hw, hw1), identical(hw1, hw2), identical(hw2, hw3))

## Using Unicode makes more sense for non-latin characters.
(nn <- "\u0126\u0119\u1114\u022d\u2001\u03e2\u0954\u0f3f\u13d3\u147b\u203c")

## Mixing \x and \u throws a _parse_ error (which is not catchable!)
## Not run: 
##D   "\x48\u65\x6c\u6c\x6f\u20\x57\u6f\x72\u6c\x64\u21"
## End(Not run)
##   -->   Error: mixing Unicode and octal/hex escapes .....

## \U works like \u, but supports up to six hex digits.
## So we can replace \u with \U in the previous example.
n2 <- "\U0126\U0119\U1114\U022d\U2001\U03e2\U0954\U0f3f\U13d3\U147b\U203c"
stopifnot(identical(nn, n2))

## Under systems supporting multi-byte locales (and not Windows),
## \U also supports the rarer characters outside the usual 16^4 range.
## See the R language manual,
## https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Literal-constants
## and bug 16098 https://bugs.r-project.org/show_bug.cgi?id=16098
## This character may or not be printable (the platform decides)
## and if it is, may not have a glyph in the font used.
"\U1d4d7" # On Windows this used to give the incorrect value of "\Ud4d7"

## nul characters (for terminating strings in C) are not allowed (parse errors)
## Not run: ##D 
##D   "foo\0bar"     # Error: nul character not allowed (line 1)
##D   "foo\u0000bar" # same error
## End(Not run)

## A Windows path written as a raw string constant:
r"(c:\Program files\R)"

## More raw strings:
r"{(\1\2)}"
r"(use both "double" and 'single' quotes)"
r"---(\1--)-)---"



cleanEx()
nameEx("Random-user")
### * Random-user

flush(stderr()); flush(stdout())

### Name: Random.user
### Title: User-supplied Random Number Generation
### Aliases: Random.user
### Keywords: distribution sysdata

### ** Examples
## Not run: 
##D ##  Marsaglia's congruential PRNG
##D #include <R_ext/Random.h>
##D 
##D static Int32 seed;
##D static double res;
##D static int nseed = 1;
##D 
##D double * user_unif_rand()
##D {
##D     seed = 69069 * seed + 1;
##D     res = seed * 2.32830643653869e-10;
##D     return &res;
##D }
##D 
##D void  user_unif_init(Int32 seed_in) { seed = seed_in; }
##D int * user_unif_nseed() { return &nseed; }
##D int * user_unif_seedloc() { return (int *) &seed; }
##D 
##D /*  ratio-of-uniforms for normal  */
##D #include <math.h>
##D static double x;
##D 
##D double * user_norm_rand()
##D {
##D     double u, v, z;
##D     do {
##D         u = unif_rand();
##D         v = 0.857764 * (2. * unif_rand() - 1);
##D         x = v/u; z = 0.25 * x * x;
##D         if (z < 1. - u) break;
##D         if (z > 0.259/u + 0.35) continue;
##D     } while (z > -log(u));
##D     return &x;
##D }
##D 
##D ## Use under Unix:
##D R CMD SHLIB urand.c
##D R
##D > dyn.load("urand.so")
##D > RNGkind("user")
##D > runif(10)
##D > .Random.seed
##D > RNGkind(, "user")
##D > rnorm(10)
##D > RNGkind()
##D [1] "user-supplied" "user-supplied"
## End(Not run)


cleanEx()
nameEx("Random")
### * Random

flush(stderr()); flush(stdout())

### Name: Random
### Title: Random Number Generation
### Aliases: Random RNG RNGkind RNGversion set.seed .Random.seed
### Keywords: distribution sysdata

### ** Examples

require(stats)

## Seed the current RNG, i.e., set the RNG status
set.seed(42); u1 <- runif(30)
set.seed(42); u2 <- runif(30) # the same because of identical RNG status:
stopifnot(identical(u1, u2))

ok <- RNGkind()
RNGkind("Wich")  # (partial string matching on 'kind')

## This shows how 'runif(.)' works for Wichmann-Hill,
## using only R functions:

p.WH <- c(30269, 30307, 30323)
a.WH <- c(  171,   172,   170)
next.WHseed <- function(i.seed = .Random.seed[-1])
  { (a.WH * i.seed) %% p.WH }
my.runif1 <- function(i.seed = .Random.seed)
  { ns <- next.WHseed(i.seed[-1]); sum(ns / p.WH) %% 1 }
set.seed(1998-12-04)# (when the next lines were added to the souRce)
rs <- .Random.seed
(WHs <- next.WHseed(rs[-1]))
u <- runif(1)
stopifnot(
 next.WHseed(rs[-1]) == .Random.seed[-1],
 all.equal(u, my.runif1(rs))
)

## ----
.Random.seed
RNGkind("Super") # matches  "Super-Duper"
RNGkind()
.Random.seed # new, corresponding to  Super-Duper

## Reset:
RNGkind(ok[1])

RNGversion(getRversion()) # the default version for this R version

## ----
sum(duplicated(runif(1e6))) # around 110 for default generator
## and we would expect about almost sure duplicates beyond about
qbirthday(1 - 1e-6, classes = 2e9) # 235,000



cleanEx()
nameEx("Recall")
### * Recall

flush(stderr()); flush(stdout())

### Name: Recall
### Title: Recursive Calling
### Aliases: Recall
### Keywords: programming

### ** Examples

## A trivial (but inefficient!) example:
fib <- function(n)
   if(n<=2) { if(n>=0) 1 else 0 } else Recall(n-1) + Recall(n-2)
fibonacci <- fib; rm(fib)
## renaming wouldn't work without Recall
fibonacci(10) # 55



cleanEx()
nameEx("Rhome")
### * Rhome

flush(stderr()); flush(stdout())

### Name: Rhome
### Title: Return the R Home Directory
### Aliases: R.home R_HOME
### Keywords: utilities

### ** Examples

## These result quite platform dependently :
rbind(home = R.home(),
      bin  = R.home("bin")) # often a sub directory of 'home'
list.files(R.home("bin"))



cleanEx()
nameEx("Round")
### * Round

flush(stderr()); flush(stdout())

### Name: Round
### Title: Rounding of Numbers
### Aliases: ceiling floor round signif trunc
### Keywords: arith

### ** Examples

round(.5 + -2:4) # IEEE / IEC rounding: -2  0  0  2  2  4  4
## (this is *good* behaviour -- do *NOT* report it as bug !)

( x1 <- seq(-2, 4, by = .5) )
round(x1) #-- IEEE / IEC rounding !
x1[trunc(x1) != floor(x1)]
x1[round(x1) != floor(x1 + .5)]
(non.int <- ceiling(x1) != floor(x1))

x2 <- pi * 100^(-1:3)
round(x2, 3)
signif(x2, 3)



cleanEx()
nameEx("S3method")
### * S3method

flush(stderr()); flush(stdout())

### Name: S3method
### Title: Register S3 Methods
### Aliases: .S3method

### ** Examples

## Create a generic function and register a method for objects
## inheriting from class 'cls':
gen <- function(x) UseMethod("gen")
met <- function(x) writeLines("Hello world.")
.S3method("gen", "cls", met)
## Create an object inheriting from class 'cls', and call the
## generic on it:
x <- structure(123, class = "cls")
gen(x)



cleanEx()
nameEx("Special")
### * Special

flush(stderr()); flush(stdout())

### Name: Special
### Title: Special Functions of Mathematics
### Aliases: Special beta lbeta gamma lgamma psigamma digamma trigamma
###   choose lchoose factorial lfactorial
### Keywords: math

### ** Examples

require(graphics)

choose(5, 2)
for (n in 0:10) print(choose(n, k = 0:n))

factorial(100)
lfactorial(10000)

## gamma has 1st order poles at 0, -1, -2, ...
## this will generate loss of precision warnings, so turn off
op <- options("warn")
options(warn = -1)
x <- sort(c(seq(-3, 4, length.out = 201), outer(0:-3, (-1:1)*1e-6, `+`)))
plot(x, gamma(x), ylim = c(-20,20), col = "red", type = "l", lwd = 2,
     main = expression(Gamma(x)))
abline(h = 0, v = -3:0, lty = 3, col = "midnightblue")
options(op)

x <- seq(0.1, 4, length.out = 201); dx <- diff(x)[1]
par(mfrow = c(2, 3))
for (ch in c("", "l","di","tri","tetra","penta")) {
  is.deriv <- nchar(ch) >= 2
  nm <- paste0(ch, "gamma")
  if (is.deriv) {
    dy <- diff(y) / dx # finite difference
    der <- which(ch == c("di","tri","tetra","penta")) - 1
    nm2 <- paste0("psigamma(*, deriv = ", der,")")
    nm  <- if(der >= 2) nm2 else paste(nm, nm2, sep = " ==\n")
    y <- psigamma(x, deriv = der)
  } else {
    y <- get(nm)(x)
  }
  plot(x, y, type = "l", main = nm, col = "red")
  abline(h = 0, col = "lightgray")
  if (is.deriv) lines(x[-1], dy, col = "blue", lty = 2)
}
par(mfrow = c(1, 1))

## "Extended" Pascal triangle:
fN <- function(n) formatC(n, width=2)
for (n in -4:10) {
    cat(fN(n),":", fN(choose(n, k = -2:max(3, n+2))))
    cat("\n")
}

## R code version of choose()  [simplistic; warning for k < 0]:
mychoose <- function(r, k)
    ifelse(k <= 0, (k == 0),
           sapply(k, function(k) prod(r:(r-k+1))) / factorial(k))
k <- -1:6
cbind(k = k, choose(1/2, k), mychoose(1/2, k))

## Binomial theorem for n = 1/2 ;
## sqrt(1+x) = (1+x)^(1/2) = sum_{k=0}^Inf  choose(1/2, k) * x^k :
k <- 0:10 # 10 is sufficient for ~ 9 digit precision:
sqrt(1.25)
sum(choose(1/2, k)* .25^k)

## Don't show: 
k. <- 1:9
stopifnot(all.equal( (choose(1/2, k.) -> ck.),
                    mychoose(1/2, k.)),
          all.equal(lchoose(1/2, k.), log(abs(ck.))),
          all.equal(sqrt(1.25),
                    sum(choose(1/2, k)* .25^k)))
## End(Don't show)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("Startup")
### * Startup

flush(stderr()); flush(stdout())

### Name: Startup
### Title: Initialization at Start of an R Session
### Aliases: Startup Rprofile .Rprofile Rprofile.site Renviron
###   Renviron.site .Renviron .First .First.sys .OptRequireMethods
###   R_DEFAULT_PACKAGES R_ENVIRON R_ENVIRON_USER R_PROFILE R_PROFILE_USER
### Keywords: environment

### ** Examples

## Not run: 
##D ## Example ~/.Renviron on Unix
##D R_LIBS=~/R/library
##D PAGER=/usr/local/bin/less
##D 
##D ## Example .Renviron on Windows
##D R_LIBS=C:/R/library
##D MY_TCLTK="c:/Program Files/Tcl/bin"
##D # Variable expansion in double quotes, string literals with backslashes in
##D # single quotes.
##D R_LIBS_USER="${APPDATA}"'\R-library'
##D 
##D ## Example of setting R_DEFAULT_PACKAGES (from R CMD check)
##D R_DEFAULT_PACKAGES='utils,grDevices,graphics,stats'
##D # this loads the packages in the order given, so they appear on
##D # the search path in reverse order.
##D 
##D ## Example of .Rprofile
##D options(width=65, digits=5)
##D options(show.signif.stars=FALSE)
##D setHook(packageEvent("grDevices", "onLoad"),
##D         function(...) grDevices::ps.options(horizontal=FALSE))
##D set.seed(1234)
##D .First <- function() cat("\n   Welcome to R!\n\n")
##D .Last <- function()  cat("\n   Goodbye!\n\n")
##D 
##D ## Example of Rprofile.site
##D local({
##D   # add MASS to the default packages, set a CRAN mirror
##D   old <- getOption("defaultPackages"); r <- getOption("repos")
##D   r["CRAN"] <- "http://my.local.cran"
##D   options(defaultPackages = c(old, "MASS"), repos = r)
##D   ## (for Unix terminal users) set the width from COLUMNS if set
##D   cols <- Sys.getenv("COLUMNS")
##D   if(nzchar(cols)) options(width = as.integer(cols))
##D   # interactive sessions get a fortune cookie (needs fortunes package)
##D   if (interactive())
##D     fortunes::fortune()
##D })
##D 
##D ## if .Renviron contains
##D FOOBAR="coo\bar"doh\ex"abc\"def'"
##D 
##D ## then we get
##D # > cat(Sys.getenv("FOOBAR"), "\n")
##D # coo\bardoh\exabc"def'
## End(Not run)


cleanEx()
nameEx("Syntax")
### * Syntax

flush(stderr()); flush(stdout())

### Name: Syntax
### Title: Operator Syntax and Precedence
### Aliases: Syntax
### Keywords: documentation programming

### ** Examples

## Logical AND ("&&") has higher precedence than OR ("||"):
TRUE || TRUE && FALSE   # is the same as
TRUE || (TRUE && FALSE) # and different from
(TRUE || TRUE) && FALSE

## Special operators have higher precedence than "!" (logical NOT).
## You can use this for %in% :
! 1:10 %in% c(2, 3, 5, 7) # same as !(1:10 %in% c(2, 3, 5, 7))
## but we strongly advise to use the "!( ... )" form in this case!


## '=' has lower precedence than '<-' ... so you should not mix them
##     (and '<-' is considered better style anyway):



cleanEx()
nameEx("Sys.getenv")
### * Sys.getenv

flush(stderr()); flush(stdout())

### Name: Sys.getenv
### Title: Get Environment Variables
### Aliases: Sys.getenv
### Keywords: environment utilities

### ** Examples

## whether HOST is set will be shell-dependent e.g. Solaris' csh does not.
Sys.getenv(c("R_HOME", "R_PAPERSIZE", "R_PRINTCMD", "HOST"))

names(s <- Sys.getenv()) # all settings (the values could be very long)
head(s, 12)# using the Dlist print() method

## Language and Locale settings -- but rather use Sys.getlocale()
s[grep("^L(C|ANG)", names(s))]



cleanEx()
nameEx("Sys.getpid")
### * Sys.getpid

flush(stderr()); flush(stdout())

### Name: Sys.getpid
### Title: Get the Process ID of the R Session
### Aliases: Sys.getpid
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("Sys.glob")
### * Sys.glob

flush(stderr()); flush(stdout())

### Name: Sys.glob
### Title: Wildcard Expansion on File Paths
### Aliases: Sys.glob
### Keywords: utilities file

### ** Examples



cleanEx()
nameEx("Sys.info")
### * Sys.info

flush(stderr()); flush(stdout())

### Name: Sys.info
### Title: Extract System and User Information
### Aliases: Sys.info
### Keywords: utilities

### ** Examples

Sys.info()
## An alternative (and probably better) way to get the login name on Unix
Sys.getenv("LOGNAME")



cleanEx()
nameEx("Sys.localeconv")
### * Sys.localeconv

flush(stderr()); flush(stdout())

### Name: Sys.localeconv
### Title: Find Details of the Numerical and Monetary Representations in
###   the Current Locale
### Aliases: localeconv Sys.localeconv
### Keywords: utilities

### ** Examples

Sys.localeconv()
## The results in the C locale are
##    decimal_point     thousands_sep          grouping   int_curr_symbol
##              "."                ""                ""                ""
##  currency_symbol mon_decimal_point mon_thousands_sep      mon_grouping
##               ""                ""                ""                ""
##    positive_sign     negative_sign   int_frac_digits       frac_digits
##               ""                ""             "127"             "127"
##    p_cs_precedes    p_sep_by_space     n_cs_precedes    n_sep_by_space
##            "127"             "127"             "127"             "127"
##      p_sign_posn       n_sign_posn
##            "127"             "127"

## Now try your default locale (which might be "C").

## Not run: read.table("foo", dec=Sys.localeconv()["decimal_point"])



cleanEx()
nameEx("Sys.readlink")
### * Sys.readlink

flush(stderr()); flush(stdout())

### Name: Sys.readlink
### Title: Read File Symbolic Links
### Aliases: Sys.readlink
### Keywords: file

### ** Examples

##' To check if files (incl. directories) are symbolic links:
is.symlink <- function(paths) isTRUE(nzchar(Sys.readlink(paths), keepNA=TRUE))
## will return all FALSE when the platform has no `readlink` system call.
is.symlink("/foo/bar")



cleanEx()
nameEx("Sys.setenv")
### * Sys.setenv

flush(stderr()); flush(stdout())

### Name: Sys.setenv
### Title: Set or Unset Environment Variables
### Aliases: Sys.setenv Sys.unsetenv
### Keywords: environment utilities

### ** Examples

print(Sys.setenv(R_TEST = "testit", "A+C" = 123))  # `A+C` could also be used
Sys.getenv("R_TEST")
Sys.unsetenv("R_TEST") # on Unix-alike may warn and not succeed
Sys.getenv("R_TEST", unset = NA)



cleanEx()
nameEx("Sys.sleep")
### * Sys.sleep

flush(stderr()); flush(stdout())

### Name: Sys.sleep
### Title: Suspend Execution for a Time Interval
### Aliases: Sys.sleep
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("Sys.time")
### * Sys.time

flush(stderr()); flush(stdout())

### Name: Sys.time
### Title: Get Current Date and Time
### Aliases: Sys.time Sys.Date
### Keywords: utilities chron

### ** Examples


cleanEx()
nameEx("Sys.which")
### * Sys.which

flush(stderr()); flush(stdout())

### Name: Sys.which
### Title: Find Full Paths to Executables
### Aliases: Sys.which
### Keywords: utilities

### ** Examples

## the first two are likely to exist everywhere
## texi2dvi exists on most Unix-alikes and under MiKTeX
Sys.which(c("ftp", "ping", "texi2dvi", "this-does-not-exist"))



cleanEx()
nameEx("Trig")
### * Trig

flush(stderr()); flush(stdout())

### Name: Trig
### Title: Trigonometric Functions
### Aliases: Trig cos sin tan acos arccos asin arcsin atan arctan atan2
###   cospi sinpi tanpi
### Keywords: math

### ** Examples

x <- seq(-3, 7, by = 1/8)
tx <- cbind(x, cos(pi*x), cospi(x), sin(pi*x), sinpi(x),
               tan(pi*x), tanpi(x), deparse.level=2)
op <- options(digits = 4, width = 90) # for nice formatting
head(tx)
tx[ (x %% 1) %in% c(0, 0.5) ,]
options(op)



cleanEx()
nameEx("Vectorize")
### * Vectorize

flush(stderr()); flush(stdout())

### Name: Vectorize
### Title: Vectorize a Scalar Function
### Aliases: Vectorize
### Keywords: manip utilities

### ** Examples

# We use rep.int as rep is primitive
vrep <- Vectorize(rep.int)
vrep(1:4, 4:1)
vrep(times = 1:4, x = 4:1)

vrep <- Vectorize(rep.int, "times")
vrep(times = 1:4, x = 42)

f <- function(x = 1:3, y) c(x, y)
vf <- Vectorize(f, SIMPLIFY = FALSE)
f(1:3, 1:3)
vf(1:3, 1:3)
vf(y = 1:3) # Only vectorizes y, not x

# Nonlinear regression contour plot, based on nls() example
require(graphics)
SS <- function(Vm, K, resp, conc) {
    pred <- (Vm * conc)/(K + conc)
    sum((resp - pred)^2 / pred)
}
vSS <- Vectorize(SS, c("Vm", "K"))
Treated <- subset(Puromycin, state == "treated")

Vm <- seq(140, 310, length.out = 50)
K <- seq(0, 0.15, length.out = 40)
SSvals <- outer(Vm, K, vSS, Treated$rate, Treated$conc)
contour(Vm, K, SSvals, levels = (1:10)^2, xlab = "Vm", ylab = "K")

# combn() has an argument named FUN
combnV <- Vectorize(function(x, m, FUNV = NULL) combn(x, m, FUN = FUNV),
                    vectorize.args = c("x", "m"))
combnV(4, 1:4)
combnV(4, 1:4, sum)



cleanEx()
nameEx("Version")
### * Version

flush(stderr()); flush(stdout())

### Name: R.Version
### Title: Version Information
### Aliases: R.Version R.version version R.version.string
### Keywords: environment sysdata programming

### ** Examples

require(graphics)

R.version$os # to check how lucky you are ...
plot(0) # any plot
mtext(R.version.string, side = 1, line = 4, adj = 1) # a useful bottom-right note

## a good way to detect macOS:
if(grepl("^darwin", R.version$os)) message("running on macOS")

## Short R version string, ("space free", useful in file/directory names;
##                          also fine for unreleased versions of R):
shortRversion <- function() {
   rvs <- R.version.string
   if(grepl("devel", (st <- R.version$status)))
       rvs <- sub(paste0(" ",st," "), "-devel_", rvs, fixed=TRUE)
   gsub("[()]", "", gsub(" ", "_", sub(" version ", "-", rvs)))
}
## Don't show: 
stopifnot(identical(grep(" ", shortRversion()), integer(0)))
## End(Don't show)



cleanEx()
nameEx("abbreviate")
### * abbreviate

flush(stderr()); flush(stdout())

### Name: abbreviate
### Title: Abbreviate Strings
### Aliases: abbreviate
### Keywords: character

### ** Examples

x <- c("abcd", "efgh", "abce")
abbreviate(x, 2)
abbreviate(x, 2, strict = TRUE) # >> 1st and 3rd are == "ab"

(st.abb <- abbreviate(state.name, 2))
stopifnot(identical(unname(st.abb),
           abbreviate(state.name, 2, named=FALSE)))
table(nchar(st.abb)) # out of 50, 3 need 4 letters :
as <- abbreviate(state.name, 3, strict = TRUE)
as[which(as == "Mss")]
## Don't show: 
stopifnot(which(as == "Mss") == c(21,24,25))
## End(Don't show)
## and without distinguishing vowels:
st.abb2 <- abbreviate(state.name, 2, FALSE)
cbind(st.abb, st.abb2)[st.abb2 != st.abb, ]

## method = "both.sides" helps:  no 4-letters, and only 4 3-letters:
st.ab2 <- abbreviate(state.name, 2, method = "both")
table(nchar(st.ab2))
## Compare the two methods:
cbind(st.abb, st.ab2)



cleanEx()
nameEx("agrep")
### * agrep

flush(stderr()); flush(stdout())

### Name: agrep
### Title: Approximate String Matching (Fuzzy Matching)
### Aliases: agrep agrepl 'fuzzy matching' .amatch_bounds .amatch_costs
### Keywords: character

### ** Examples

agrep("lasy", "1 lazy 2")
agrep("lasy", c(" 1 lazy 2", "1 lasy 2"), max.distance = list(sub = 0))
agrep("laysy", c("1 lazy", "1", "1 LAZY"), max.distance = 2)
agrep("laysy", c("1 lazy", "1", "1 LAZY"), max.distance = 2, value = TRUE)
agrep("laysy", c("1 lazy", "1", "1 LAZY"), max.distance = 2, ignore.case = TRUE)



cleanEx()
nameEx("all")
### * all

flush(stderr()); flush(stdout())

### Name: all
### Title: Are All Values True?
### Aliases: all
### Keywords: logic

### ** Examples

range(x <- sort(round(stats::rnorm(10) - 1.2, 1)))
if(all(x < 0)) cat("all x values are negative\n")

all(logical(0))  # true, as all zero of the elements are true.



cleanEx()
nameEx("all.equal")
### * all.equal

flush(stderr()); flush(stdout())

### Name: all.equal
### Title: Test if Two Objects are (Nearly) Equal
### Aliases: all.equal all.equal.default all.equal.numeric
###   all.equal.character all.equal.environment all.equal.envRefClass
###   all.equal.factor all.equal.formula all.equal.function all.equal.list
###   all.equal.language all.equal.POSIXt all.equal.raw attr.all.equal
### Keywords: programming utilities logic arith

### ** Examples

all.equal(pi, 355/113)
# not precise enough (default tol) > relative error

d45 <- pi*(1/4 + 1:10) ; one <- rep(1, 10)
tan(d45) == one  # mostly FALSE, as not exactly
stopifnot(all.equal(
          tan(d45), one)) # TRUE, but not if we are picky:
all.equal(tan(d45), one, tolerance = 0)  # to see difference
all.equal(tan(d45), one, tolerance = 0, scale = 1)# "absolute diff.."
all.equal(tan(d45), one, tolerance = 0, scale = 1+(-2:2)/1e9) # "absolute"
all.equal(tan(d45), one, tolerance = 0, scale = 1+(-2:2)/1e6) # "scaled"

## advanced: equality of environments
ae <- all.equal(as.environment("package:stats"),
                asNamespace("stats"))
stopifnot(is.character(ae), length(ae) > 10,
          ## were incorrectly "considered equal" in R <= 3.1.1
          all.equal(asNamespace("stats"), asNamespace("stats")))

## A situation where  'countEQ = TRUE' makes sense:
x1 <- x2 <- (1:100)/10;  x2[2] <- 1.1*x1[2]
## 99 out of 100 pairs (x1[i], x2[i]) are equal:
plot(x1,x2, main = "all.equal.numeric() -- not counting equal parts")
all.equal(x1,x2) ## "Mean relative difference: 0.1"
mtext(paste("all.equal(x1,x2) :", all.equal(x1,x2)), line= -2)
##' extract the 'Mean relative difference' as number:
all.eqNum <- function(...) as.numeric(sub(".*:", '', all.equal(...)))
set.seed(17)
## When x2 is jittered, typically all pairs (x1[i],x2[i]) do differ:
summary(r <- replicate(100, all.eqNum(x1, x2*(1+rnorm(x1)*1e-7))))
mtext(paste("mean(all.equal(x1, x2*(1 + eps_k))) {100 x} Mean rel.diff.=",
            signif(mean(r), 3)), line = -4, adj=0)
## With argument  countEQ=TRUE, get "the same" (w/o need for jittering):
mtext(paste("all.equal(x1,x2, countEQ=TRUE) :",
          signif(all.eqNum(x1,x2, countEQ=TRUE), 3)), line= -6, col=2)

## comparison of date-time objects
now <- Sys.time()
stopifnot(
all.equal(now, now + 1e-4)  # TRUE (default tolerance = 0.001 seconds)
)
all.equal(now, now + 0.2)
all.equal(now, as.POSIXlt(now, "UTC"))
stopifnot(
all.equal(now, as.POSIXlt(now, "UTC"), check.tzone = FALSE)  # TRUE
)



cleanEx()
nameEx("allnames")
### * allnames

flush(stderr()); flush(stdout())

### Name: all.names
### Title: Find All Names in an Expression
### Aliases: all.names all.vars
### Keywords: programming

### ** Examples

all.names(expression(sin(x+y)))
all.names(quote(sin(x+y))) # or a call
all.vars(expression(sin(x+y)))



cleanEx()
nameEx("any")
### * any

flush(stderr()); flush(stdout())

### Name: any
### Title: Are Some Values True?
### Aliases: any
### Keywords: logic

### ** Examples

range(x <- sort(round(stats::rnorm(10) - 1.2, 1)))
if(any(x < 0)) cat("x contains negative values\n")



cleanEx()
nameEx("aperm")
### * aperm

flush(stderr()); flush(stdout())

### Name: aperm
### Title: Array Transposition
### Aliases: aperm aperm.default aperm.table
### Keywords: array

### ** Examples

# interchange the first two subscripts on a 3-way array x
x  <- array(1:24, 2:4)
xt <- aperm(x, c(2,1,3))
stopifnot(t(xt[,,2]) == x[,,2],
          t(xt[,,3]) == x[,,3],
          t(xt[,,4]) == x[,,4])

UCB <- aperm(UCBAdmissions, c(2,1,3))
UCB[1,,]
summary(UCB) # UCB is still a contingency table
## Don't show: 
stopifnot(is.table(UCB))
## End(Don't show)



cleanEx()
nameEx("append")
### * append

flush(stderr()); flush(stdout())

### Name: append
### Title: Vector Merging
### Aliases: append
### Keywords: manip

### ** Examples

append(1:5, 0:1, after = 3)



cleanEx()
nameEx("apply")
### * apply

flush(stderr()); flush(stdout())

### Name: apply
### Title: Apply Functions Over Array Margins
### Aliases: apply
### Keywords: iteration array

### ** Examples

## Compute row and column sums for a matrix:
x <- cbind(x1 = 3, x2 = c(4:1, 2:5))
dimnames(x)[[1]] <- letters[1:8]
apply(x, 2, mean, trim = .2)
col.sums <- apply(x, 2, sum)
row.sums <- apply(x, 1, sum)
rbind(cbind(x, Rtot = row.sums), Ctot = c(col.sums, sum(col.sums)))

stopifnot( apply(x, 2, is.vector))

## Sort the columns of a matrix
apply(x, 2, sort)

## keeping named dimnames
names(dimnames(x)) <- c("row", "col")
x3 <- array(x, dim = c(dim(x),3),
	    dimnames = c(dimnames(x), list(C = paste0("cop.",1:3))))
identical(x,  apply( x,  2,  identity))
identical(x3, apply(x3, 2:3, identity))
## Don't show: 
xN <- x; dimnames(xN) <- list(row=NULL, col=NULL)
x2 <- x; names(dimnames(x2)) <- NULL
fXY <- function(u) c(X=u[1], Y=u[2])
ax1 <- apply(x, 1, fXY)
ax2 <- apply(x2,1, fXY)
stopifnot(identical(dimnames(ax1), list(col=c("X.x1", "Y.x2"), row=letters[1:8])),
          identical(dimnames(ax2), unname(dimnames(ax1))),
          identical( x, apply( x, 2, identity)),
          identical(xN, apply(xN, 2, identity)),
	  identical(dimnames(x),
		    dimnames(apply(x, 2, format))),
          identical(x3, apply(x3, 2:3, identity)),
	  identical(dimnames(apply(x3, 2:1, identity)),
		    dimnames(x3)[3:1]))
rm(xN, x2, fXY, ax1, ax2)
## End(Don't show)
##- function with extra args:
cave <- function(x, c1, c2) c(mean(x[c1]), mean(x[c2]))
apply(x, 1, cave,  c1 = "x1", c2 = c("x1","x2"))

ma <- matrix(c(1:4, 1, 6:8), nrow = 2)
ma
apply(ma, 1, table)  #--> a list of length 2
apply(ma, 1, stats::quantile) # 5 x n matrix with rownames

stopifnot(dim(ma) == dim(apply(ma, 1:2, sum)))

## Example with different lengths for each call
z <- array(1:24, dim = 2:4)
zseq <- apply(z, 1:2, function(x) seq_len(max(x)))
zseq         ## a 2 x 3 matrix
typeof(zseq) ## list
dim(zseq) ## 2 3
zseq[1,]
apply(z, 3, function(x) seq_len(max(x)))
# a list without a dim attribute



cleanEx()
nameEx("args")
### * args

flush(stderr()); flush(stdout())

### Name: args
### Title: Argument List of a Function
### Aliases: args
### Keywords: documentation

### ** Examples

## "regular" (non-primitive) functions "print their arguments"
## (by returning another function with NULL body which you also see):
args(ls)
args(graphics::plot.default)
utils::str(ls) # (just "prints": does not show a NULL)

## You can also pass a string naming a function.
args("scan")
## ...but :: package specification doesn't work in this case.
tryCatch(args("graphics::plot.default"), error = print)

## As explained above, args() gives a function with empty body:
list(is.f = is.function(args(scan)), body = body(args(scan)))

## Primitive functions mostly behave like non-primitive functions.
args(c)
args(`+`)
## primitive functions without well-defined argument list return NULL:
args(`if`)



cleanEx()
nameEx("array")
### * array

flush(stderr()); flush(stdout())

### Name: array
### Title: Multi-way Arrays
### Aliases: array as.array as.array.default is.array
### Keywords: array

### ** Examples

dim(as.array(letters))
array(1:3, c(2,4)) # recycle 1:3 "2 2/3 times"
#     [,1] [,2] [,3] [,4]
#[1,]    1    3    2    1
#[2,]    2    1    3    2



cleanEx()
nameEx("as.Date")
### * as.Date

flush(stderr()); flush(stdout())

### Name: as.Date
### Title: Date Conversion Functions to and from Character
### Aliases: format.Date as.character.Date as.Date as.Date.character
###   as.Date.default as.Date.factor as.Date.POSIXct as.Date.POSIXlt
###   as.Date.date as.Date.dates as.Date.numeric
### Keywords: utilities chron

### ** Examples

## read in date info in format 'ddmmmyyyy'
## This will give NA(s) in some locales; setting the C locale
## as in the commented lines will overcome this on most systems.
## lct <- Sys.getlocale("LC_TIME"); Sys.setlocale("LC_TIME", "C")
x <- c("1jan1960", "2jan1960", "31mar1960", "30jul1960")
z <- as.Date(x, "%d%b%Y")
## Sys.setlocale("LC_TIME", lct)
z

## read in date/time info in format 'm/d/y'
dates <- c("02/27/92", "02/27/92", "01/14/92", "02/28/92", "02/01/92")
as.Date(dates, "%m/%d/%y")

## date given as number of days since 1900-01-01 (a date in 1989)
as.Date(32768, origin = "1900-01-01")
## Excel is said to use 1900-01-01 as day 1 (Windows default) or
## 1904-01-01 as day 0 (Mac default), but this is complicated by Excel
## incorrectly treating 1900 as a leap year.
## So for dates (post-1901) from Windows Excel
as.Date(35981, origin = "1899-12-30") # 1998-07-05
## and Mac Excel
as.Date(34519, origin = "1904-01-01") # 1998-07-05
## (these values come from http://support.microsoft.com/kb/214330)

## Experiment shows that Matlab's origin is 719529 days before ours,
## (it takes the non-existent 0000-01-01 as day 1)
## so Matlab day 734373 can be imported as
as.Date(734373, origin = "1970-01-01") - 719529 # 2010-08-23
## (value from
## http://www.mathworks.de/de/help/matlab/matlab_prog/represent-date-and-times-in-MATLAB.html)

## Time zone effect
z <- ISOdate(2010, 04, 13, c(0,12)) # midnight and midday UTC
as.Date(z) # in UTC



cleanEx()
nameEx("as.POSIXlt")
### * as.POSIXlt

flush(stderr()); flush(stdout())

### Name: as.POSIX*
### Title: Date-time Conversion Functions
### Aliases: as.POSIXct as.POSIXct.default as.POSIXct.POSIXlt
###   as.POSIXct.date as.POSIXct.dates as.POSIXct.Date as.POSIXct.numeric
###   as.POSIXlt as.POSIXlt.Date as.POSIXlt.date as.POSIXlt.dates
###   as.POSIXlt.POSIXct as.POSIXlt.factor as.POSIXlt.character
###   as.POSIXlt.default as.POSIXlt.numeric as.double.POSIXlt
### Keywords: utilities chron

### ** Examples

tab <- file.path(R.home("share"), "zoneinfo", "zone1970.tab")
if(file.exists(tab)) {
  cols <- c("code", "coordinates", "TZ", "comments")
  tmp <- read.delim(file.path(R.home("share"), "zoneinfo", "zone1970.tab"),
                    header = FALSE, comment.char = "#", col.names = cols)
  if(interactive()) View(tmp)
  head(tmp, 10)
}


cleanEx()
nameEx("as.environment")
### * as.environment

flush(stderr()); flush(stdout())

### Name: as.environment
### Title: Coerce to an Environment Object
### Aliases: as.environment
### Keywords: data environment

### ** Examples

as.environment(1) ## the global environment
identical(globalenv(), as.environment(1)) ## is TRUE
try( ## <<- stats need not be attached
    as.environment("package:stats"))
ee <- as.environment(list(a = "A", b = pi, ch = letters[1:8]))
ls(ee) # names of objects in ee
utils::ls.str(ee)



cleanEx()
nameEx("as.function")
### * as.function

flush(stderr()); flush(stdout())

### Name: as.function
### Title: Convert Object to Function
### Aliases: as.function as.function.default
### Keywords: programming

### ** Examples

as.function(alist(a = , b = 2, a+b))
as.function(alist(a = , b = 2, a+b))(3)



cleanEx()
nameEx("asplit")
### * asplit

flush(stderr()); flush(stdout())

### Name: asplit
### Title: Split Array/Matrix By Its Margins
### Aliases: asplit
### Keywords: array

### ** Examples

## A 3-dimensional array of dimension 2 x 3 x 4:
d <- 2 : 4
x <- array(seq_len(prod(d)), d)
x
## Splitting by margin 2 gives a 1-d list array of length 3
## consisting of 2 x 4 arrays:
asplit(x, 2)
## Spltting by margins 1 and 2 gives a 2 x 3 list array
## consisting of 1-d arrays of length 4:a
asplit(x, c(1, 2))
## Compare to
split(x, slice.index(x, c(1, 2)))

## A 2 x 3 matrix:
(x <- matrix(1 : 6, 2, 3))
## To split x by its rows, one can use
asplit(x, 1)
## or less efficiently
split(x, slice.index(x, 1))
split(x, row(x))



cleanEx()
nameEx("assign")
### * assign

flush(stderr()); flush(stdout())

### Name: assign
### Title: Assign a Value to a Name
### Aliases: assign
### Keywords: data

### ** Examples

for(i in 1:6) { #-- Create objects  'r.1', 'r.2', ... 'r.6' --
    nam <- paste("r", i, sep = ".")
    assign(nam, 1:i)
}
ls(pattern = "^r..$")

##-- Global assignment within a function:
myf <- function(x) {
    innerf <- function(x) assign("Global.res", x^2, envir = .GlobalEnv)
    innerf(x+1)
}
myf(3)
Global.res # 16

a <- 1:4
assign("a[1]", 2)
a[1] == 2          # FALSE
get("a[1]") == 2   # TRUE




cleanEx()
nameEx("attach")
### * attach

flush(stderr()); flush(stdout())

### Name: attach
### Title: Attach Set of R Objects to Search Path
### Aliases: attach .conflicts.OK
### Keywords: data

### ** Examples

require(utils)

summary(women$height)   # refers to variable 'height' in the data frame
attach(women)
summary(height)         # The same variable now available by name
height <- height*2.54   # Don't do this. It creates a new variable
                        # in the user's workspace
find("height")
summary(height)         # The new variable in the workspace
rm(height)
summary(height)         # The original variable.
height <<- height*25.4  # Change the copy in the attached environment
find("height")
summary(height)         # The changed copy
detach("women")
summary(women$height)   # unchanged

## Not run: 
##D ## create an environment on the search path and populate it
##D sys.source("myfuns.R", envir = attach(NULL, name = "myfuns"))
## End(Not run)


cleanEx()
nameEx("attr")
### * attr

flush(stderr()); flush(stdout())

### Name: attr
### Title: Object Attributes
### Aliases: attr attr<-
### Keywords: attribute

### ** Examples

# create a 2 by 5 matrix
x <- 1:10
attr(x,"dim") <- c(2, 5)



cleanEx()
nameEx("attributes")
### * attributes

flush(stderr()); flush(stdout())

### Name: attributes
### Title: Object Attribute Lists
### Aliases: attributes attributes<- mostattributes<-
### Keywords: attribute

### ** Examples

x <- cbind(a = 1:3, pi = pi) # simple matrix with dimnames
attributes(x)

## strip an object's attributes:
attributes(x) <- NULL
x # now just a vector of length 6

mostattributes(x) <- list(mycomment = "really special", dim = 3:2,
   dimnames = list(LETTERS[1:3], letters[1:5]), names = paste(1:6))
x # dim(), but not {dim}names



cleanEx()
nameEx("autoload")
### * autoload

flush(stderr()); flush(stdout())

### Name: autoload
### Title: On-demand Loading of Packages
### Aliases: autoload autoloader .AutoloadEnv .Autoloaded Autoloads
### Keywords: data programming

### ** Examples

require(stats)
autoload("interpSpline", "splines")
search()
ls("Autoloads")
.Autoloaded

x <- sort(stats::rnorm(12))
y <- x^2
is <- interpSpline(x, y)
search() ## now has splines
detach("package:splines")
search()
is2 <- interpSpline(x, y+x)
search() ## and again
detach("package:splines")



cleanEx()
nameEx("backsolve")
### * backsolve

flush(stderr()); flush(stdout())

### Name: backsolve
### Title: Solve an Upper or Lower Triangular System
### Aliases: backsolve forwardsolve
### Keywords: algebra array

### ** Examples

## upper triangular matrix 'r':
r <- rbind(c(1,2,3),
           c(0,1,1),
           c(0,0,2))
( y <- backsolve(r, x <- c(8,4,2)) ) # -1 3 1
r %*% y # == x = (8,4,2)
backsolve(r, x, transpose = TRUE) # 8 -12 -5



cleanEx()
nameEx("basename")
### * basename

flush(stderr()); flush(stdout())

### Name: basename
### Title: Manipulate File Paths
### Aliases: basename dirname
### Keywords: file

### ** Examples

basename(file.path("","p1","p2","p3", c("file1", "file2")))
dirname (file.path("","p1","p2","p3", "filename"))



cleanEx()
nameEx("bincode")
### * bincode

flush(stderr()); flush(stdout())

### Name: .bincode
### Title: Bin a Numeric Vector
### Aliases: .bincode
### Keywords: category

### ** Examples

## An example with non-unique breaks:
x <- c(0, 0.01, 0.5, 0.99, 1)
b <- c(0, 0, 1, 1)
.bincode(x, b, TRUE)
.bincode(x, b, FALSE)
.bincode(x, b, TRUE, TRUE)
.bincode(x, b, FALSE, TRUE)



cleanEx()
nameEx("bindenv")
### * bindenv

flush(stderr()); flush(stdout())

### Name: bindenv
### Title: Binding and Environment Locking, Active Bindings
### Aliases: bindenv lockEnvironment environmentIsLocked lockBinding
###   unlockBinding makeActiveBinding bindingIsLocked bindingIsActive
###   activeBindingFunction
### Keywords: utilities

### ** Examples

# locking environments
e <- new.env()
assign("x", 1, envir = e)
get("x", envir = e)
lockEnvironment(e)
get("x", envir = e)
assign("x", 2, envir = e)
try(assign("y", 2, envir = e)) # error

# locking bindings
e <- new.env()
assign("x", 1, envir = e)
get("x", envir = e)
lockBinding("x", e)
try(assign("x", 2, envir = e)) # error
unlockBinding("x", e)
assign("x", 2, envir = e)
get("x", envir = e)

# active bindings
f <- local( {
    x <- 1
    function(v) {
       if (missing(v))
           cat("get\n")
       else {
           cat("set\n")
           x <<- v
       }
       x
    }
})
makeActiveBinding("fred", f, .GlobalEnv)
bindingIsActive("fred", .GlobalEnv)
fred
fred <- 2
fred



cleanEx()
nameEx("bitwise")
### * bitwise

flush(stderr()); flush(stdout())

### Name: bitwise
### Title: Bitwise Logical Operations
### Aliases: bitwNot bitwAnd bitwOr bitwXor bitwShiftL bitwShiftR
### Keywords: logic

### ** Examples

bitwNot(0:12) # -1 -2  ... -13
bitwAnd(15L, 7L) #  7
bitwOr (15L, 7L) # 15
bitwXor(15L, 7L) #  8
bitwXor(-1L, 1L) # -2

## The "same" for 'raw' instead of integer :
rr12 <- as.raw(0:12) ; rbind(rr12, !rr12)
c(r15 <- as.raw(15), r7 <- as.raw(7)) #  0f 07
r15 & r7    # 07
r15 | r7    # 0f
xor(r15, r7)# 08

bitwShiftR(-1, 1:31) # shifts of 2^32-1 = 4294967295



cleanEx()
nameEx("body")
### * body

flush(stderr()); flush(stdout())

### Name: body
### Title: Access to and Manipulation of the Body of a Function
### Aliases: body body<-
### Keywords: programming

### ** Examples

body(body)
f <- function(x) x^5
body(f) <- quote(5^x)
## or equivalently  body(f) <- expression(5^x)
f(3) # = 125
body(f)

## creating a multi-expression body
e <- expression(y <- x^2, return(y)) # or a list
body(f) <- as.call(c(as.name("{"), e))
f
f(8)
## Using substitute() may be simpler than 'as.call(c(as.name("{",..)))':
stopifnot(identical(body(f), substitute({ y <- x^2; return(y) })))



cleanEx()
nameEx("bquote")
### * bquote

flush(stderr()); flush(stdout())

### Name: bquote
### Title: Partial substitution in expressions
### Aliases: bquote
### Keywords: programming data

### ** Examples

require(graphics)

a <- 2

bquote(a == a)
quote(a == a)

bquote(a == .(a))
substitute(a == A, list(A = a))

plot(1:10, a*(1:10), main = bquote(a == .(a)))

## to set a function default arg
default <- 1
bquote( function(x, y = .(default)) x+y )

exprs <- expression(x <- 1, y <- 2, x + y)
bquote(function() {..(exprs)}, splice = TRUE)



cleanEx()
nameEx("by")
### * by

flush(stderr()); flush(stdout())

### Name: by
### Title: Apply a Function to a Data Frame Split by Factors
### Aliases: by by.default by.data.frame print.by
### Keywords: iteration category

### ** Examples

require(stats)
by(warpbreaks[, 1:2], warpbreaks[,"tension"], summary)
by(warpbreaks[, 1],   warpbreaks[, -1],       summary)
by(warpbreaks, warpbreaks[,"tension"],
   function(x) lm(breaks ~ wool, data = x))

## now suppose we want to extract the coefficients by group
tmp <- with(warpbreaks,
            by(warpbreaks, tension,
               function(x) lm(breaks ~ wool, data = x)))
sapply(tmp, coef)



cleanEx()
nameEx("c")
### * c

flush(stderr()); flush(stdout())

### Name: c
### Title: Combine Values into a Vector or List
### Aliases: c c.default
### Keywords: manip

### ** Examples

c(1,7:9)
c(1:5, 10.5, "next")

## uses with a single argument to drop attributes
x <- 1:4
names(x) <- letters[1:4]
x
c(x)          # has names
as.vector(x)  # no names
dim(x) <- c(2,2)
x
c(x)
as.vector(x)

## append to a list:
ll <- list(A = 1, c = "C")
## do *not* use
c(ll, d = 1:3) # which is == c(ll, as.list(c(d = 1:3)))
## but rather
c(ll, d = list(1:3))  # c() combining two lists

c(list(A = c(B = 1)), recursive = TRUE)

c(options(), recursive = TRUE)
c(list(A = c(B = 1, C = 2), B = c(E = 7)), recursive = TRUE)



cleanEx()
nameEx("call")
### * call

flush(stderr()); flush(stdout())

### Name: call
### Title: Function Calls
### Aliases: call is.call as.call
### Keywords: programming attribute

### ** Examples

is.call(call) #-> FALSE: Functions are NOT calls

## set up a function call to round with argument 10.5
cl <- call("round", 10.5)
is.call(cl) # TRUE
cl
identical(quote(round(10.5)), # <- less functional, but the same
          cl) # TRUE
## such a call can also be evaluated.
eval(cl) # [1] 10

class(cl) # "call"
typeof(cl)# "language"
is.call(cl) && is.language(cl) # always TRUE for "call"s

A <- 10.5
call("round", A)        # round(10.5)
call("round", quote(A)) # round(A)
f <- "round"
call(f, quote(A))       # round(A)
## if we want to supply a function we need to use as.call or similar
f <- round
## Not run: call(f, quote(A))  # error: first arg must be character
(g <- as.call(list(f, quote(A))))
eval(g)
## alternatively but less transparently
g <- list(f, quote(A))
mode(g) <- "call"
g
eval(g)
## see also the examples in the help for do.call



cleanEx()
nameEx("callCC")
### * callCC

flush(stderr()); flush(stdout())

### Name: callCC
### Title: Call With Current Continuation
### Aliases: callCC
### Keywords: programming

### ** Examples

# The following all return the value 1
callCC(function(k) 1)
callCC(function(k) k(1))
callCC(function(k) {k(1); 2})
callCC(function(k) repeat k(1))



cleanEx()
nameEx("capabilities")
### * capabilities

flush(stderr()); flush(stdout())

### Name: capabilities
### Title: Report Capabilities of this Build of R
### Aliases: capabilities
### Keywords: utilities

### ** Examples

capabilities()

if(!capabilities("ICU"))
   warning("ICU is not available")

## Does not call the internal X11-checking function:
capabilities(Xchk = FALSE)

## See also the examples for 'connections'.



cleanEx()
nameEx("cat")
### * cat

flush(stderr()); flush(stdout())

### Name: cat
### Title: Concatenate and Print
### Aliases: cat
### Keywords: print file connection

### ** Examples

iter <- stats::rpois(1, lambda = 10)
## print an informative message
cat("iteration = ", iter <- iter + 1, "\n")

## 'fill' and label lines:
cat(paste(letters, 100* 1:26), fill = TRUE, labels = paste0("{", 1:10, "}:"))



cleanEx()
nameEx("cbind")
### * cbind

flush(stderr()); flush(stdout())

### Name: cbind
### Title: Combine R Objects by Rows or Columns
### Aliases: cbind rbind cbind.data.frame rbind.data.frame .__H__.cbind
###   .__H__.rbind
### Keywords: array manip

### ** Examples

m <- cbind(1, 1:7) # the '1' (= shorter vector) is recycled
m
m <- cbind(m, 8:14)[, c(1, 3, 2)] # insert a column
m
cbind(1:7, diag(3)) # vector is subset -> warning

cbind(0, rbind(1, 1:3))
cbind(I = 0, X = rbind(a = 1, b = 1:3))  # use some names
xx <- data.frame(I = rep(0,2))
cbind(xx, X = rbind(a = 1, b = 1:3))   # named differently

cbind(0, matrix(1, nrow = 0, ncol = 4)) #> Warning (making sense)
dim(cbind(0, matrix(1, nrow = 2, ncol = 0))) #-> 2 x 1

## deparse.level
dd <- 10
rbind(1:4, c = 2, "a++" = 10, dd, deparse.level = 0) # middle 2 rownames
rbind(1:4, c = 2, "a++" = 10, dd, deparse.level = 1) # 3 rownames (default)
rbind(1:4, c = 2, "a++" = 10, dd, deparse.level = 2) # 4 rownames

## cheap row names:
b0 <- gl(3,4, labels=letters[1:3])
bf <- setNames(b0, paste0("o", seq_along(b0)))
df  <- data.frame(a = 1, B = b0, f = gl(4,3))
df. <- data.frame(a = 1, B = bf, f = gl(4,3))
new <- data.frame(a = 8, B ="B", f = "1")
(df1  <- rbind(df , new))
(df.1 <- rbind(df., new))
stopifnot(identical(df1, rbind(df,  new, make.row.names=FALSE)),
          identical(df1, rbind(df., new, make.row.names=FALSE)))
## Don't show: 
## Testing a semi-official use:
d2 <- rbind.data.frame(as.list(df), as.list(new))
d3 <- rbind.data.frame(as.list(df), as.list(new), make.row.names=FALSE)
stopifnot(identical(.row_names_info(d3), -13L))
## no longer: attr(d2, "row.names")[c(1,13)] == c("13", "131")
row.names(d2) <- attr(d3, "row.names")# = 1:13
stopifnot(identical(d2, d3))
## End(Don't show)



cleanEx()
nameEx("char.expand")
### * char.expand

flush(stderr()); flush(stdout())

### Name: char.expand
### Title: Expand a String with Respect to a Target Table
### Aliases: char.expand
### Keywords: character

### ** Examples

locPars <- c("mean", "median", "mode")
char.expand("me", locPars, warning("Could not expand!"))
char.expand("mo", locPars)



cleanEx()
nameEx("character")
### * character

flush(stderr()); flush(stdout())

### Name: character
### Title: Character Vectors
### Aliases: character as.character as.character.default
###   as.character.factor is.character
### Keywords: character classes

### ** Examples

form <- y ~ a + b + c
as.character(form)  ## length 3
deparse(form)       ## like the input

a0 <- 11/999          # has a repeating decimal representation
(a1 <- as.character(a0))
format(a0, digits = 16) # shows one more digit
a2 <- as.numeric(a1)
a2 - a0               # normally around -1e-17
as.character(a2)      # normally different from a1
print(c(a0, a2), digits = 16)



cleanEx()
nameEx("charmatch")
### * charmatch

flush(stderr()); flush(stdout())

### Name: charmatch
### Title: Partial String Matching
### Aliases: charmatch
### Keywords: character

### ** Examples

charmatch("", "")                             # returns 1
charmatch("m",   c("mean", "median", "mode")) # returns 0
charmatch("med", c("mean", "median", "mode")) # returns 2



cleanEx()
nameEx("chartr")
### * chartr

flush(stderr()); flush(stdout())

### Name: chartr
### Title: Character Translation and Casefolding
### Aliases: chartr tolower toupper casefold
### Keywords: character

### ** Examples

x <- "MiXeD cAsE 123"
chartr("iXs", "why", x)
chartr("a-cX", "D-Fw", x)
tolower(x)
toupper(x)

## "Mixed Case" Capitalizing - toupper( every first letter of a word ) :

.simpleCap <- function(x) {
    s <- strsplit(x, " ")[[1]]
    paste(toupper(substring(s, 1, 1)), substring(s, 2),
          sep = "", collapse = " ")
}
.simpleCap("the quick red fox jumps over the lazy brown dog")
## ->  [1] "The Quick Red Fox Jumps Over The Lazy Brown Dog"

## and the better, more sophisticated version:
capwords <- function(s, strict = FALSE) {
    cap <- function(s) paste(toupper(substring(s, 1, 1)),
                  {s <- substring(s, 2); if(strict) tolower(s) else s},
                             sep = "", collapse = " " )
    sapply(strsplit(s, split = " "), cap, USE.NAMES = !is.null(names(s)))
}
capwords(c("using AIC for model selection"))
## ->  [1] "Using AIC For Model Selection"
capwords(c("using AIC", "for MODEL selection"), strict = TRUE)
## ->  [1] "Using Aic"  "For Model Selection"
##                ^^^        ^^^^^
##               'bad'       'good'

## -- Very simple insecure crypto --
rot <- function(ch, k = 13) {
   p0 <- function(...) paste(c(...), collapse = "")
   A <- c(letters, LETTERS, " '")
   I <- seq_len(k); chartr(p0(A), p0(c(A[-I], A[I])), ch)
}

pw <- "my secret pass phrase"
(crypw <- rot(pw, 13)) #-> you can send this off

## now ``decrypt'' :
rot(crypw, 54 - 13) # -> the original:
stopifnot(identical(pw, rot(crypw, 54 - 13)))



cleanEx()
nameEx("chkDots")
### * chkDots

flush(stderr()); flush(stdout())

### Name: chkDots
### Title: Warn About Extraneous Arguments in the "..." of Its Caller
### Aliases: chkDots
### Keywords: utilities

### ** Examples

seq.default ## <- you will see  ' chkDots(...) '

seq(1,5, foo = "bar") # gives warning via chkDots()

## warning with more than one ...-entry:
density.f <- function(x, ...) NextMethod("density")
x <- density(structure(rnorm(10), class="f"), bar=TRUE, baz=TRUE)



cleanEx()
nameEx("chol")
### * chol

flush(stderr()); flush(stdout())

### Name: chol
### Title: The Cholesky Decomposition
### Aliases: chol chol.default
### Keywords: algebra array

### ** Examples

( m <- matrix(c(5,1,1,3),2,2) )
( cm <- chol(m) )
t(cm) %*% cm  #-- = 'm'
crossprod(cm)  #-- = 'm'

# now for something positive semi-definite
x <- matrix(c(1:5, (1:5)^2), 5, 2)
x <- cbind(x, x[, 1] + 3*x[, 2])
colnames(x) <- letters[20:22]
m <- crossprod(x)
qr(m)$rank # is 2, as it should be

# chol() may fail, depending on numerical rounding:
# chol() unlike qr() does not use a tolerance.
#try(chol(m))

#(Q <- chol(m, pivot = TRUE))
## we can use this by
#pivot <- attr(Q, "pivot")
#crossprod(Q[, order(pivot)]) # recover m

## now for a non-positive-definite matrix
# ( m <- matrix(c(5,-5,-5,3), 2, 2) )
# try(chol(m))  # fails
# (Q <- chol(m, pivot = TRUE)) # warning
# crossprod(Q)  # not equal to m



cleanEx()
nameEx("chol2inv")
### * chol2inv

flush(stderr()); flush(stdout())

### Name: chol2inv
### Title: Inverse from Cholesky (or QR) Decomposition
### Aliases: chol2inv
### Keywords: algebra array

### ** Examples

cma <- chol(ma  <- cbind(1, 1:3, c(1,3,7)))
ma %*% chol2inv(cma)



cleanEx()
nameEx("class")
### * class

flush(stderr()); flush(stdout())

### Name: class
### Title: Object Classes
### Aliases: class .class2 class<- oldClass oldClass<- unclass inherits isa
### Keywords: methods classes

### ** Examples

x <- 10
class(x) # "numeric"
oldClass(x) # NULL
inherits(x, "a") #FALSE
class(x) <- c("a", "b")
inherits(x,"a") #TRUE
inherits(x, "a", TRUE) # 1
inherits(x, c("a", "b", "c"), TRUE) # 1 2 0

class( quote(pi) )           # "name"
## regular calls
class( quote(sin(pi*x)) )    # "call"
## special calls
class( quote(x <- 1) )       # "<-"
class( quote((1 < 2)) )      # "("
class( quote( if(8<3) pi ) ) # "if"

.class2(pi)               # "double" "numeric"
.class2(matrix(1:6, 2,3)) # "matrix" "array" "integer" "numeric"



cleanEx()
nameEx("col")
### * col

flush(stderr()); flush(stdout())

### Name: col
### Title: Column Indexes
### Aliases: col .col
### Keywords: array

### ** Examples

# extract an off-diagonal of a matrix
ma <- matrix(1:12, 3, 4)
ma[row(ma) == col(ma) + 1]

# create an identity 5-by-5 matrix more slowly than diag(n = 5):
x <- matrix(0, nrow = 5, ncol = 5)
x[row(x) == col(x)] <- 1

(i34 <- .col(3:4))
stopifnot(identical(i34, .col(c(3,4)))) # 'dim' maybe "double"



cleanEx()
nameEx("colSums")
### * colSums

flush(stderr()); flush(stdout())

### Name: colSums
### Title: Form Row and Column Sums and Means
### Aliases: colSums rowSums colMeans rowMeans .colSums .rowSums .colMeans
###   .rowMeans
### Keywords: array algebra arith

### ** Examples

## Compute row and column sums for a matrix:
x <- cbind(x1 = 3, x2 = c(4:1, 2:5))
rowSums(x); colSums(x)
dimnames(x)[[1]] <- letters[1:8]
rowSums(x); colSums(x); rowMeans(x); colMeans(x)
x[] <- as.integer(x)
rowSums(x); colSums(x)
x[] <- x < 3
rowSums(x); colSums(x)
x <- cbind(x1 = 3, x2 = c(4:1, 2:5))
x[3, ] <- NA; x[4, 2] <- NA
rowSums(x); colSums(x); rowMeans(x); colMeans(x)
rowSums(x, na.rm = TRUE); colSums(x, na.rm = TRUE)
rowMeans(x, na.rm = TRUE); colMeans(x, na.rm = TRUE)

## an array
dim(UCBAdmissions)
rowSums(UCBAdmissions); rowSums(UCBAdmissions, dims = 2)
colSums(UCBAdmissions); colSums(UCBAdmissions, dims = 2)

## complex case
x <- cbind(x1 = 3 + 2i, x2 = c(4:1, 2:5) - 5i)
x[3, ] <- NA; x[4, 2] <- NA
rowSums(x); colSums(x); rowMeans(x); colMeans(x)
rowSums(x, na.rm = TRUE); colSums(x, na.rm = TRUE)
rowMeans(x, na.rm = TRUE); colMeans(x, na.rm = TRUE)



cleanEx()
nameEx("colnames")
### * colnames

flush(stderr()); flush(stdout())

### Name: row+colnames
### Title: Row and Column Names
### Aliases: rownames rownames<- colnames colnames<-
### Keywords: array manip

### ** Examples

m0 <- matrix(NA, 4, 0)
rownames(m0)

m2 <- cbind(1, 1:4)
colnames(m2, do.NULL = FALSE)
colnames(m2) <- c("x","Y")
rownames(m2) <- rownames(m2, do.NULL = FALSE, prefix = "Obs.")
m2



cleanEx()
nameEx("commandArgs")
### * commandArgs

flush(stderr()); flush(stdout())

### Name: commandArgs
### Title: Extract Command Line Arguments
### Aliases: commandArgs
### Keywords: environment sysdata programming

### ** Examples

commandArgs()
## Spawn a copy of this application as it was invoked,
## subject to shell quoting issues
## system(paste(commandArgs(), collapse = " "))



cleanEx()
nameEx("comment")
### * comment

flush(stderr()); flush(stdout())

### Name: comment
### Title: Query or Set a '"comment"' Attribute
### Aliases: comment comment<-
### Keywords: attribute

### ** Examples

x <- matrix(1:12, 3, 4)
comment(x) <- c("This is my very important data from experiment #0234",
                "Jun 5, 1998")
x
comment(x)



cleanEx()
nameEx("complex")
### * complex

flush(stderr()); flush(stdout())

### Name: complex
### Title: Complex Numbers and Basic Functionality
### Aliases: complex as.complex is.complex Re Im Mod Arg Conj
### Keywords: complex

### ** Examples

require(graphics)

0i ^ (-3:3)

matrix(1i^ (-6:5), nrow = 4) #- all columns are the same
0 ^ 1i # a complex NaN

## create a complex normal vector
z <- complex(real = stats::rnorm(100), imaginary = stats::rnorm(100))
## or also (less efficiently):
z2 <- 1:2 + 1i*(8:9)

## The Arg(.) is an angle:
zz <- (rep(1:4, length.out = 9) + 1i*(9:1))/10
zz.shift <- complex(modulus = Mod(zz), argument = Arg(zz) + pi)
plot(zz, xlim = c(-1,1), ylim = c(-1,1), col = "red", asp = 1,
     main = expression(paste("Rotation by "," ", pi == 180^o)))
abline(h = 0, v = 0, col = "blue", lty = 3)
points(zz.shift, col = "orange")

showC <- function(z) noquote(sprintf("(R = %g, I = %g)", Re(z), Im(z)))

## The exact result of this *depends* on the platform, compiler, math-library:
(NpNA <- NaN + NA_complex_) ; str(NpNA) # *behaves* as 'cplx NA' ..
stopifnot(is.na(NpNA), is.na(NA_complex_), is.na(Re(NA_complex_)), is.na(Im(NA_complex_)))
showC(NpNA)# but not always is {shows  '(R = NaN, I = NA)' on some platforms}
## and this is not TRUE everywhere:
identical(NpNA, NA_complex_)
showC(NA_complex_) # always == (R = NA, I = NA)



cleanEx()
nameEx("conditions")
### * conditions

flush(stderr()); flush(stdout())

### Name: conditions
### Title: Condition Handling and Recovery
### Aliases: conditions condition computeRestarts conditionCall
###   conditionMessage findRestart invokeRestart tryInvokeRestart
###   invokeRestartInteractively isRestart restartDescription
###   restartFormals signalCondition simpleCondition simpleError
###   simpleWarning simpleMessage errorCondition warningCondition tryCatch
###   withCallingHandlers withRestarts suspendInterrupts allowInterrupts
###   globalCallingHandlers .signalSimpleWarning .handleSimpleError
###   .tryResumeInterrupt as.character.condition as.character.error
###   conditionCall.condition conditionMessage.condition print.condition
###   print.restart
### Keywords: programming error

### ** Examples

tryCatch(1, finally = print("Hello"))
e <- simpleError("test error")
## Not run: 
##D  stop(e)
##D  tryCatch(stop(e), finally = print("Hello"))
##D  tryCatch(stop("fred"), finally = print("Hello"))
## End(Not run)
tryCatch(stop(e), error = function(e) e, finally = print("Hello"))
tryCatch(stop("fred"),  error = function(e) e, finally = print("Hello"))
withCallingHandlers({ warning("A"); 1+2 }, warning = function(w) {})
## Not run: 
##D  { withRestarts(stop("A"), abort = function() {}); 1 }
## End(Not run)
withRestarts(invokeRestart("foo", 1, 2), foo = function(x, y) {x + y})

##--> More examples are part of
##-->   demo(error.catching)



cleanEx()
nameEx("conflicts")
### * conflicts

flush(stderr()); flush(stdout())

### Name: conflicts
### Title: Search for Masked Objects on the Search Path
### Aliases: conflicts
### Keywords: utilities

### ** Examples

lm <- 1:3
conflicts(, TRUE)
## gives something like
# $.GlobalEnv
# [1] "lm"
#
# $package:base
# [1] "lm"

## Remove things from your "workspace" that mask others:
remove(list = conflicts(detail = TRUE)$.GlobalEnv)



cleanEx()
nameEx("connections")
### * connections

flush(stderr()); flush(stdout())

### Name: connections
### Title: Functions to Manipulate Connections (Files, URLs, ...)
### Aliases: connections connection file clipboard pipe fifo gzfile unz
###   bzfile xzfile url socketConnection socketAccept serverSocket
###   socketTimeout open open.connection isOpen isIncomplete close
###   close.connection flush flush.connection print.connection
###   summary.connection
### Keywords: file connection

### ** Examples

zzfil <- tempfile(fileext=".data")
zz <- file(zzfil, "w")  # open an output file connection
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = zz, sep = "\n")
cat("One more line\n", file = zz)
close(zz)
readLines(zzfil)
unlink(zzfil)

zzfil <- tempfile(fileext=".gz")
zz <- gzfile(zzfil, "w")  # compressed file
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = zz, sep = "\n")
close(zz)
readLines(zz <- gzfile(zzfil))
close(zz)
unlink(zzfil)
zz # an invalid connection

zzfil <- tempfile(fileext=".bz2")
zz <- bzfile(zzfil, "w")  # bzip2-ed file
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = zz, sep = "\n")
close(zz)
zz # print() method: invalid connection
print(readLines(zz <- bzfile(zzfil)))
close(zz)
unlink(zzfil)

## An example of a file open for reading and writing
Tpath <- tempfile("test")
Tfile <- file(Tpath, "w+")
c(isOpen(Tfile, "r"), isOpen(Tfile, "w")) # both TRUE
cat("abc\ndef\n", file = Tfile)
readLines(Tfile)
seek(Tfile, 0, rw = "r") # reset to beginning
readLines(Tfile)
cat("ghi\n", file = Tfile)
readLines(Tfile)
close(Tfile)
unlink(Tpath)

## We can do the same thing with an anonymous file.
Tfile <- file()
cat("abc\ndef\n", file = Tfile)
readLines(Tfile)
close(Tfile)

## Not run: 
##D ## fifo example -- may hang even with OS support for fifos
##D if(capabilities("fifo")) {
##D   zzfil <- tempfile(fileext="-fifo")
##D   zz <- fifo(zzfil, "w+")
##D   writeLines("abc", zz)
##D   print(readLines(zz))
##D   close(zz)
##D   unlink(zzfil)
##D }
## End(Not run)
## Not run: 
##D ## example for a machine running a finger daemon
##D 
##D con <- socketConnection(port = 79, blocking = TRUE)
##D writeLines(paste0(system("whoami", intern = TRUE), "\r"), con)
##D gsub(" *$", "", readLines(con))
##D close(con)
## End(Not run)

## Not run: 
##D ## Two R processes communicating via non-blocking sockets
##D # R process 1
##D con1 <- socketConnection(port = 6011, server = TRUE)
##D writeLines(LETTERS, con1)
##D close(con1)
##D 
##D # R process 2
##D con2 <- socketConnection(Sys.info()["nodename"], port = 6011)
##D # as non-blocking, may need to loop for input
##D readLines(con2)
##D while(isIncomplete(con2)) {
##D    Sys.sleep(1)
##D    z <- readLines(con2)
##D    if(length(z)) print(z)
##D }
##D close(con2)
##D 
##D ## examples of use of encodings
##D # write a file in UTF-8
##D cat(x, file = (con <- file("foo", "w", encoding = "UTF-8"))); close(con)
##D # read a 'Windows Unicode' file
##D A <- read.table(con <- file("students", encoding = "UCS-2LE")); close(con)
## End(Not run)


cleanEx()
nameEx("crossprod")
### * crossprod

flush(stderr()); flush(stdout())

### Name: crossprod
### Title: Matrix Crossproduct
### Aliases: crossprod tcrossprod
### Keywords: algebra array

### ** Examples

(z <- crossprod(1:4))    # = sum(1 + 2^2 + 3^2 + 4^2)
drop(z)                  # scalar
x <- 1:4; names(x) <- letters[1:4]; x
tcrossprod(as.matrix(x)) # is
identical(tcrossprod(as.matrix(x)),
          crossprod(t(x)))
tcrossprod(x)            # no dimnames

m <- matrix(1:6, 2,3) ; v <- 1:3; v2 <- 2:1
stopifnot(identical(tcrossprod(v, m), v %*% t(m)),
          identical(tcrossprod(v, m), crossprod(v, t(m))),
          identical(crossprod(m, v2), t(m) %*% v2))



cleanEx()
nameEx("cumsum")
### * cumsum

flush(stderr()); flush(stdout())

### Name: cumsum
### Title: Cumulative Sums, Products, and Extremes
### Aliases: cumsum cumprod cummin cummax
### Keywords: arith

### ** Examples

cumsum(1:10)
cumprod(1:10)
cummin(c(3:1, 2:0, 4:2))
cummax(c(3:1, 2:0, 4:2))



cleanEx()
nameEx("curlGetHeaders")
### * curlGetHeaders

flush(stderr()); flush(stdout())

### Name: curlGetHeaders
### Title: Retrieve Headers from URLs
### Aliases: curlGetHeaders

### ** Examples


cleanEx()
nameEx("cut.POSIXt")
### * cut.POSIXt

flush(stderr()); flush(stdout())

### Name: cut.POSIXt
### Title: Convert a Date or Date-Time Object to a Factor
### Aliases: cut.POSIXt cut.Date
### Keywords: manip chron

### ** Examples

## random dates in a 10-week period
cut(ISOdate(2001, 1, 1) + 70*86400*stats::runif(100), "weeks")
cut(as.Date("2001/1/1") + 70*stats::runif(100), "weeks")

# The standards all have midnight as the start of the day, but some
# people incorrectly interpret it at the end of the previous day ...
tm <- seq(as.POSIXct("2012-06-01 06:00"), by = "6 hours", length.out = 24)
aggregate(1:24, list(day = cut(tm, "days")), mean)
# and a version with midnight included in the previous day:
aggregate(1:24, list(day = cut(tm, "days", right = TRUE)), mean)



cleanEx()
nameEx("cut")
### * cut

flush(stderr()); flush(stdout())

### Name: cut
### Title: Convert Numeric to Factor
### Aliases: cut cut.default
### Keywords: category

### ** Examples

Z <- stats::rnorm(10000)
table(cut(Z, breaks = -6:6))
sum(table(cut(Z, breaks = -6:6, labels = FALSE)))
sum(graphics::hist(Z, breaks = -6:6, plot = FALSE)$counts)

cut(rep(1,5), 4) #-- dummy
tx0 <- c(9, 4, 6, 5, 3, 10, 5, 3, 5)
x <- rep(0:8, tx0)
stopifnot(table(x) == tx0)

table( cut(x, breaks = 8))
table( cut(x, breaks = 3*(-2:5)))
table( cut(x, breaks = 3*(-2:5), right = FALSE))

##--- some values OUTSIDE the breaks :
table(cx  <- cut(x, breaks = 2*(0:4)))
table(cxl <- cut(x, breaks = 2*(0:4), right = FALSE))
which(is.na(cx));  x[is.na(cx)]  #-- the first 9  values  0
which(is.na(cxl)); x[is.na(cxl)] #-- the last  5  values  8


## Label construction:
y <- stats::rnorm(100)
table(cut(y, breaks = pi/3*(-3:3)))
table(cut(y, breaks = pi/3*(-3:3), dig.lab = 4))

table(cut(y, breaks =  1*(-3:3), dig.lab = 4))
# extra digits don't "harm" here
table(cut(y, breaks =  1*(-3:3), right = FALSE))
#- the same, since no exact INT!

## sometimes the default dig.lab is not enough to be avoid confusion:
aaa <- c(1,2,3,4,5,2,3,4,5,6,7)
cut(aaa, 3)
cut(aaa, 3, dig.lab = 4, ordered_result = TRUE)

## one way to extract the breakpoints
labs <- levels(cut(aaa, 3))
cbind(lower = as.numeric( sub("\\((.+),.*", "\\1", labs) ),
      upper = as.numeric( sub("[^,]*,([^]]*)\\]", "\\1", labs) ))



cleanEx()
nameEx("data.class")
### * data.class

flush(stderr()); flush(stdout())

### Name: data.class
### Title: Object Classes
### Aliases: data.class
### Keywords: classes methods

### ** Examples

x <- LETTERS
data.class(factor(x))                 # has a class attribute
data.class(matrix(x, ncol = 13))      # has a dim attribute
data.class(list(x))                   # the same as mode(x)
data.class(x)                         # the same as mode(x)

stopifnot(data.class(1:2) == "numeric") # compatibility "rule"



cleanEx()
nameEx("data.frame")
### * data.frame

flush(stderr()); flush(stdout())

### Name: data.frame
### Title: Data Frames
### Aliases: data.frame
### Keywords: classes methods

### ** Examples

L3 <- LETTERS[1:3]
char <- sample(L3, 10, replace = TRUE)
(d <- data.frame(x = 1, y = 1:10, char = char))
## The "same" with automatic column names:
data.frame(1, 1:10, sample(L3, 10, replace = TRUE))

is.data.frame(d)

## enable automatic conversion of character arguments to factor columns:
(dd <- data.frame(d, fac = letters[1:10], stringsAsFactors = TRUE))
rbind(class = sapply(dd, class), mode = sapply(dd, mode))

stopifnot(1:10 == row.names(d))  # {coercion}

(d0  <- d[, FALSE])   # data frame with 0 columns and 10 rows
(d.0 <- d[FALSE, ])   # <0 rows> data frame  (3 named cols)
(d00 <- d0[FALSE, ])  # data frame with 0 columns and 0 rows



cleanEx()
nameEx("data.matrix")
### * data.matrix

flush(stderr()); flush(stdout())

### Name: data.matrix
### Title: Convert a Data Frame to a Numeric Matrix
### Aliases: data.matrix
### Keywords: array

### ** Examples

DF <- data.frame(a = 1:3, b = letters[10:12],
                 c = seq(as.Date("2004-01-01"), by = "week", length.out = 3),
                 stringsAsFactors = TRUE)
data.matrix(DF[1:2])
data.matrix(DF)



cleanEx()
nameEx("date")
### * date

flush(stderr()); flush(stdout())

### Name: date
### Title: System Date and Time
### Aliases: date
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("dcf")
### * dcf

flush(stderr()); flush(stdout())

### Name: dcf
### Title: Read and Write Data in DCF Format
### Aliases: read.dcf write.dcf
### Keywords: print file

### ** Examples


cleanEx()
nameEx("debug")
### * debug

flush(stderr()); flush(stdout())

### Name: debug
### Title: Debug a Function
### Aliases: debug debugonce undebug isdebugged debuggingState
### Keywords: programming environment

### ** Examples

## Not run: 
##D debug(library)
##D library(methods)
## End(Not run)
## Not run: 
##D debugonce(sample)
##D ## only the first call will be debugged
##D sampe(10, 1)
##D sample(10, 1)
## End(Not run)



cleanEx()
nameEx("delayedAssign")
### * delayedAssign

flush(stderr()); flush(stdout())

### Name: delayedAssign
### Title: Delay Evaluation
### Aliases: delayedAssign promise promises
### Keywords: programming data

### ** Examples

msg <- "old"
delayedAssign("x", msg)
substitute(x) # shows only 'x', as it is in the global env.
msg <- "new!"
x # new!

delayedAssign("x", {
    for(i in 1:3)
        cat("yippee!\n")
    10
})

x^2 #- yippee
x^2 #- simple number

ne <- new.env()
delayedAssign("x", pi + 2, assign.env = ne)
## See the promise {without "forcing" (i.e. evaluating) it}:
substitute(x, ne) #  'pi + 2'
## Don't show: 
stopifnot(identical(substitute(x,ne), quote(pi + 2)))
## End(Don't show)

### Promises in an environment [for advanced users]:  ---------------------

e <- (function(x, y = 1, z) environment())(cos, "y", {cat(" HO!\n"); pi+2})
## How can we look at all promises in an env (w/o forcing them)?
gete <- function(e_)
   lapply(lapply(ls(e_), as.name),
          function(n) eval(substitute(substitute(X, e_), list(X=n))))

(exps <- gete(e))
sapply(exps, typeof)

(le <- as.list(e)) # evaluates ("force"s) the promises
stopifnot(identical(unname(le), lapply(exps, eval))) # and another "Ho!"



cleanEx()
nameEx("deparse")
### * deparse

flush(stderr()); flush(stdout())

### Name: deparse
### Title: Expression Deparsing
### Aliases: deparse deparse1
### Keywords: programming manip data

### ** Examples

require(stats); require(graphics)

deparse(args(lm))
deparse(args(lm), width.cutoff = 500)

myplot <- function(x, y) {
    plot(x, y, xlab = deparse1(substitute(x)),
               ylab = deparse1(substitute(y)))
}

e <- quote(`foo bar`)
deparse(e)
deparse(e, backtick = TRUE)
e <- quote(`foo bar`+1)
deparse(e)
deparse(e, control = "all") # wraps it w/ quote( . )



cleanEx()
nameEx("deparseOpts")
### * deparseOpts

flush(stderr()); flush(stdout())

### Name: deparseOpts
### Title: Options for Expression Deparsing
### Aliases: .deparseOpts ..deparseOpts
### Keywords: programming

### ** Examples

stopifnot(.deparseOpts("exact") == .deparseOpts(c("all", "hexNumeric")))
(iOpt.all <- .deparseOpts("all")) # a four digit integer

## one integer --> vector binary bits
int2bits <- function(x, base = 2L,
                     ndigits = 1 + floor(1e-9 + log(max(x,1), base))) {
    r <- numeric(ndigits)
    for (i in ndigits:1) {
        r[i] <- x%%base
        if (i > 1L)
            x <- x%/%base
    }
    rev(r) # smallest bit at left
}
int2bits(iOpt.all)
## What options does  "all" contain ? =========
(depO.indiv <- setdiff(..deparseOpts, c("all", "exact")))
(oa <- depO.indiv[int2bits(iOpt.all) == 1])# 8 strings
stopifnot(identical(iOpt.all, .deparseOpts(oa)))

## ditto for "exact" instead of "all":
(iOpt.X <- .deparseOpts("exact"))
data.frame(opts = depO.indiv,
           all  = int2bits(iOpt.all),
           exact= int2bits(iOpt.X))
(oX <- depO.indiv[int2bits(iOpt.X) == 1]) # 8 strings, too
diffXall <- oa != oX
stopifnot(identical(iOpt.X, .deparseOpts(oX)),
          identical(oX[diffXall], "hexNumeric"),
          identical(oa[diffXall], "digits17"))



cleanEx()
nameEx("det")
### * det

flush(stderr()); flush(stdout())

### Name: det
### Title: Calculate the Determinant of a Matrix
### Aliases: det determinant determinant.matrix
### Keywords: array

### ** Examples

(x <- matrix(1:4, ncol = 2))
unlist(determinant(x))
det(x)

det(print(cbind(1, 1:3, c(2,0,1))))



cleanEx()
nameEx("detach")
### * detach

flush(stderr()); flush(stdout())

### Name: detach
### Title: Detach Objects from the Search Path
### Aliases: detach
### Keywords: data

### ** Examples

require(splines) # package
detach(package:splines)
## or also
library(splines)
pkg <- "package:splines"
## Don't show: 
stopifnot(inherits(tryCatch(detach(pkg), error = function(.).),  "error"))
## End(Don't show)
detach(pkg, character.only = TRUE)

## careful: do not do this unless 'splines' is not already attached.
library(splines)
detach(2) # 'pos' used for 'name'

## an example of the name argument to attach
## and of detaching a database named by a character vector
attach_and_detach <- function(db, pos = 2)
{
   name <- deparse1(substitute(db))
   attach(db, pos = pos, name = name)
   print(search()[pos])
   detach(name, character.only = TRUE)
}
attach_and_detach(women, pos = 3)



cleanEx()
nameEx("diag")
### * diag

flush(stderr()); flush(stdout())

### Name: diag
### Title: Matrix Diagonals
### Aliases: diag diag<-
### Keywords: array

### ** Examples

dim(diag(3))
diag(10, 3, 4) # guess what?
all(diag(1:3) == {m <- matrix(0,3,3); diag(m) <- 1:3; m})

## other "numeric"-like diagonal matrices :
diag(c(1i,2i))    # complex
diag(TRUE, 3)     # logical
diag(as.raw(1:3)) # raw
(D2 <- diag(2:1, 4)); typeof(D2) # "integer"

require(stats)
## diag(<var-cov-matrix>) = variances
diag(var(M <- cbind(X = 1:5, Y = rnorm(5))))
#-> vector with names "X" and "Y"
rownames(M) <- c(colnames(M), rep("", 3))
M; diag(M) #  named as well
diag(M, names = FALSE) # w/o names
## Don't show: 
stopifnot(identical(names(diag(M)), colnames(M)),
                    is.null(names(diag(M,      names=FALSE))),
                    is.null(names(diag(var(M), names=FALSE)))) 
## End(Don't show)



cleanEx()
nameEx("diff")
### * diff

flush(stderr()); flush(stdout())

### Name: diff
### Title: Lagged Differences
### Aliases: diff diff.default diff.POSIXt diff.Date
### Keywords: arith

### ** Examples

diff(1:10, 2)
diff(1:10, 2, 2)
x <- cumsum(cumsum(1:10))
diff(x, lag = 2)
diff(x, differences = 2)

diff(.leap.seconds)



cleanEx()
nameEx("difftime")
### * difftime

flush(stderr()); flush(stdout())

### Name: difftime
### Title: Time Intervals / Differences
### Aliases: difftime as.difftime *.difftime /.difftime Math.difftime
###   Ops.difftime Summary.difftime [.difftime [<-.difftime
###   as.double.difftime as.list.difftime c.difftime diff.difftime
###   format.difftime is.numeric.difftime length<-.difftime mean.difftime
###   print.difftime rep.difftime units.difftime units<-.difftime units
###   units<- 'time interval'
### Keywords: utilities chron

### ** Examples


cleanEx()
nameEx("dim")
### * dim

flush(stderr()); flush(stdout())

### Name: dim
### Title: Dimensions of an Object
### Aliases: dim dim.data.frame dim<-
### Keywords: array

### ** Examples

x <- 1:12 ; dim(x) <- c(3,4)
x

# simple versions of nrow and ncol could be defined as follows
nrow0 <- function(x) dim(x)[1]
ncol0 <- function(x) dim(x)[2]



cleanEx()
nameEx("dimnames")
### * dimnames

flush(stderr()); flush(stdout())

### Name: dimnames
### Title: Dimnames of an Object
### Aliases: dimnames dimnames<- dimnames.data.frame dimnames<-.data.frame
###   provideDimnames
### Keywords: array manip

### ** Examples

## simple versions of rownames and colnames
## could be defined as follows
rownames0 <- function(x) dimnames(x)[[1]]
colnames0 <- function(x) dimnames(x)[[2]]

(dn <- dimnames(A <- provideDimnames(N <- array(1:24, dim = 2:4))))
A0 <- A; dimnames(A)[2:3] <- list(NULL)
stopifnot(identical(A0, provideDimnames(A)))
strd <- function(x) utils::str(dimnames(x))
strd(provideDimnames(A, base= list(letters[-(1:9)], tail(LETTERS))))
strd(provideDimnames(N, base= list(letters[-(1:9)], tail(LETTERS)))) # recycling
strd(provideDimnames(A, base= list(c("AA","BB")))) # recycling on both levels
## set "empty dimnames":
provideDimnames(rbind(1, 2:3), base = list(""), unique=FALSE)



cleanEx()
nameEx("do.call")
### * do.call

flush(stderr()); flush(stdout())

### Name: do.call
### Title: Execute a Function Call
### Aliases: do.call
### Keywords: programming

### ** Examples

do.call("complex", list(imaginary = 1:3))

## if we already have a list (e.g., a data frame)
## we need c() to add further arguments
tmp <- expand.grid(letters[1:2], 1:3, c("+", "-"))
do.call("paste", c(tmp, sep = ""))

do.call(paste, list(as.name("A"), as.name("B")), quote = TRUE)

## examples of where objects will be found.
A <- 2
f <- function(x) print(x^2)
env <- new.env()
assign("A", 10, envir = env)
assign("f", f, envir = env)
f <- function(x) print(x)
f(A)                                      # 2
do.call("f", list(A))                     # 2
do.call("f", list(A), envir = env)        # 4
do.call( f,  list(A), envir = env)        # 2
do.call("f", list(quote(A)), envir = env) # 100
do.call( f,  list(quote(A)), envir = env) # 10
do.call("f", list(as.name("A")), envir = env) # 100

eval(call("f", A))                      # 2
eval(call("f", quote(A)))               # 2
eval(call("f", A), envir = env)         # 4
eval(call("f", quote(A)), envir = env)  # 100



cleanEx()
nameEx("dots")
### * dots

flush(stderr()); flush(stdout())

### Name: dots
### Title: ..., '..1', etc used in Functions
### Aliases: dots ... ..1 ..2 ...elt ...length ...names
### Keywords: programming documentation

### ** Examples

tst <- function(n, ...) ...elt(n)
tst(1, pi=pi*0:1, 2:4) ## [1] 0.000000 3.141593
tst(2, pi=pi*0:1, 2:4) ## [1] 2 3 4
try(tst(1)) # -> Error about '...' not containing an element.

tst.dl  <- function(x, ...) ...length()
tst.dns <- function(x, ...) ...names()
tst.dl(1:10)    # 0  (because the first argument is 'x')
tst.dl(4, 5)    # 1
tst.dl(4, 5, 6) # 2  namely '5, 6'
tst.dl(4, 5, 6, 7, sin(1:10), "foo"/"bar") # 5.    Note: no evaluation!
tst.dns(4, foo=5, 6, bar=7, sini = sin(1:10), "foo"/"bar")
##        "foo"  "" "bar"  "sini"               ""

## From R 4.1.0 to 4.1.2, ...names() sometimes did not match names(list(...));
## check and show (these examples all would've failed):
chk.n2 <- function(...) stopifnot(identical(print(...names()), names(list(...))))
chk.n2(4, foo=5, 6, bar=7, sini = sin(1:10), "bar")
chk.n2()
chk.n2(1,2)



cleanEx()
nameEx("double")
### * double

flush(stderr()); flush(stdout())

### Name: double
### Title: Double-Precision Vectors
### Aliases: double as.double is.double single as.single as.single.default
### Keywords: classes

### ** Examples

is.double(1)
all(double(3) == 0)



cleanEx()
nameEx("dput")
### * dput

flush(stderr()); flush(stdout())

### Name: dput
### Title: Write an Object to a File or Recreate it
### Aliases: dput dget
### Keywords: file programming connection

### ** Examples

fil <- tempfile()
## Write an ASCII version of the 'base' function mean() to our temp file, ..
dput(base::mean, fil)
## ... read it back into 'bar' and confirm it is the same
bar <- dget(fil)
stopifnot(all.equal(bar, base::mean, check.environment = FALSE))

## Create a function with comments
baz <- function(x) {
  # Subtract from one
  1-x
}
## and display it
dput(baz)
## and now display the saved source
dput(baz, control = "useSource")

## Numeric values:
xx <- pi^(1:3)
dput(xx)
dput(xx, control = "digits17")
dput(xx, control = "hexNumeric")
dput(xx, fil); dget(fil) - xx # slight rounding on all platforms
dput(xx, fil, control = "digits17")
dget(fil) - xx # slight rounding on some platforms
dput(xx, fil, control = "hexNumeric"); dget(fil) - xx
unlink(fil)

xn <- setNames(xx, paste0("pi^",1:3))
dput(xn) # nicer, now "niceNames" being part of default 'control'
dput(xn, control = "S_compat") # no names
## explicitly asking for output as in R < 3.5.0:
dput(xn, control = c("keepNA", "keepInteger", "showAttributes"))



cleanEx()
nameEx("drop")
### * drop

flush(stderr()); flush(stdout())

### Name: drop
### Title: Drop Redundant Extent Information
### Aliases: drop
### Keywords: array

### ** Examples

dim(drop(array(1:12, dim = c(1,3,1,1,2,1,2)))) # = 3 2 2
drop(1:3 %*% 2:4)  # scalar product



cleanEx()
nameEx("droplevels")
### * droplevels

flush(stderr()); flush(stdout())

### Name: droplevels
### Title: Drop Unused Levels from Factors
### Aliases: droplevels droplevels.factor droplevels.data.frame
### Keywords: category NA

### ** Examples

aq <- transform(airquality, Month = factor(Month, labels = month.abb[5:9]))
aq <- subset(aq, Month != "Jul")
table(           aq $Month)
table(droplevels(aq)$Month)



cleanEx()
nameEx("dump")
### * dump

flush(stderr()); flush(stdout())

### Name: dump
### Title: Text Representations of R Objects
### Aliases: dump
### Keywords: file connection

### ** Examples

x <- 1; y <- 1:10
fil <- tempfile(fileext=".Rdmped")
dump(ls(pattern = '^[xyz]'), fil)
print(.Last.value)
unlink(fil)



cleanEx()
nameEx("duplicated")
### * duplicated

flush(stderr()); flush(stdout())

### Name: duplicated
### Title: Determine Duplicate Elements
### Aliases: duplicated duplicated.default duplicated.data.frame
###   duplicated.matrix duplicated.array anyDuplicated
###   anyDuplicated.default anyDuplicated.array anyDuplicated.matrix
###   anyDuplicated.data.frame
### Keywords: logic manip

### ** Examples

x <- c(9:20, 1:5, 3:7, 0:8)
## extract unique elements
(xu <- x[!duplicated(x)])
## similar, same elements but different order:
(xu2 <- x[!duplicated(x, fromLast = TRUE)])

## xu == unique(x) but unique(x) is more efficient
stopifnot(identical(xu,  unique(x)),
          identical(xu2, unique(x, fromLast = TRUE)))

duplicated(iris)[140:143]

duplicated(iris3, MARGIN = c(1, 3))
anyDuplicated(iris) ## 143
## Don't show: 
stopifnot(identical(anyDuplicated(iris), 143L),
          identical(anyDuplicated(iris3, MARGIN = c(1, 3)), 143L))
## End(Don't show)
anyDuplicated(x)
anyDuplicated(x, fromLast = TRUE)



cleanEx()
nameEx("dynload")
### * dynload

flush(stderr()); flush(stdout())

### Name: dyn.load
### Title: Foreign Function Interface
### Aliases: dyn.load dyn.unload is.loaded R_MAX_NUM_DLLS
### Keywords: interface

### ** Examples

## expect all of these to be false in R >= 3.0.0.
is.loaded("supsmu") # Fortran entry point in stats
is.loaded("supsmu", "stats", "Fortran")
is.loaded("PDF", type = "External") # pdf() device in grDevices



cleanEx()
nameEx("eapply")
### * eapply

flush(stderr()); flush(stdout())

### Name: eapply
### Title: Apply a Function Over Values in an Environment
### Aliases: eapply
### Keywords: iteration environment list

### ** Examples

require(stats)

env <- new.env(hash = FALSE) # so the order is fixed
env$a <- 1:10
env$beta <- exp(-3:3)
env$logic <- c(TRUE, FALSE, FALSE, TRUE)
# what have we there?
utils::ls.str(env)

# compute the mean for each list element
       eapply(env, mean)
unlist(eapply(env, mean, USE.NAMES = FALSE))

# median and quartiles for each element (making use of "..." passing):
eapply(env, quantile, probs = 1:3/4)
eapply(env, quantile)



cleanEx()
nameEx("eigen")
### * eigen

flush(stderr()); flush(stdout())

### Name: eigen
### Title: Spectral Decomposition of a Matrix
### Aliases: eigen print.eigen
### Keywords: algebra array

### ** Examples

eigen(cbind(c(1,-1), c(-1,1)))
eigen(cbind(c(1,-1), c(-1,1)), symmetric = FALSE)
# same (different algorithm).

eigen(cbind(1, c(1,-1)), only.values = TRUE)
eigen(cbind(-1, 2:1)) # complex values
eigen(print(cbind(c(0, 1i), c(-1i, 0)))) # Hermite ==> real Eigenvalues
## 3 x 3:
eigen(cbind( 1, 3:1, 1:3))
eigen(cbind(-1, c(1:2,0), 0:2)) # complex values




cleanEx()
nameEx("encodeString")
### * encodeString

flush(stderr()); flush(stdout())

### Name: encodeString
### Title: Encode Character Vector as for Printing
### Aliases: encodeString
### Keywords: utilities

### ** Examples

x <- "ab\bc\ndef"
print(x)
cat(x) # interprets escapes
cat(encodeString(x), "\n", sep = "") # similar to print()

factor(x) # makes use of this to print the levels

x <- c("a", "ab", "abcde")
encodeString(x) # width = 0: use as little as possible
encodeString(x, 2) # use two or more (left justified)
encodeString(x, width = NA) # left justification
encodeString(x, width = NA, justify = "c")
encodeString(x, width = NA, justify = "r")
encodeString(x, width = NA, quote = "'", justify = "r")



cleanEx()
nameEx("environment")
### * environment

flush(stderr()); flush(stdout())

### Name: environment
### Title: Environment Access
### Aliases: environment environment<- .GlobalEnv globalenv emptyenv
###   baseenv is.environment new.env parent.env parent.env<-
###   .BaseNamespaceEnv environmentName env.profile enclosure
### Keywords: data programming

### ** Examples

f <- function() "top level function"

##-- all three give the same:
environment()
environment(f)
.GlobalEnv

ls(envir = environment(stats::approxfun(1:2, 1:2, method = "const")))

is.environment(.GlobalEnv) # TRUE

e1 <- new.env(parent = baseenv())  # this one has enclosure package:base.
e2 <- new.env(parent = e1)
assign("a", 3, envir = e1)
ls(e1)
ls(e2)
exists("a", envir = e2)   # this succeeds by inheritance
exists("a", envir = e2, inherits = FALSE)
exists("+", envir = e2)   # this succeeds by inheritance

eh <- new.env(hash = TRUE, size = NA)
with(env.profile(eh), stopifnot(size == length(counts)))



cleanEx()
nameEx("eval")
### * eval

flush(stderr()); flush(stdout())

### Name: eval
### Title: Evaluate an (Unevaluated) Expression
### Aliases: eval evalq eval.parent local
### Keywords: data programming

### ** Examples

eval(2 ^ 2 ^ 3)
mEx <- expression(2^2^3); mEx; 1 + eval(mEx)
eval({ xx <- pi; xx^2}) ; xx

a <- 3 ; aa <- 4 ; evalq(evalq(a+b+aa, list(a = 1)), list(b = 5)) # == 10
a <- 3 ; aa <- 4 ; evalq(evalq(a+b+aa, -1), list(b = 5))        # == 12

ev <- function() {
   e1 <- parent.frame()
   ## Evaluate a in e1
   aa <- eval(expression(a), e1)
   ## evaluate the expression bound to a in e1
   a <- expression(x+y)
   list(aa = aa, eval = eval(a, e1))
}
tst.ev <- function(a = 7) { x <- pi; y <- 1; ev() }
tst.ev()  #-> aa : 7,  eval : 4.14

a <- list(a = 3, b = 4)
with(a, a <- 5) # alters the copy of a from the list, discarded.

##
## Example of evalq()
##

N <- 3
env <- new.env()
assign("N", 27, envir = env)
## this version changes the visible copy of N only, since the argument
## passed to eval is '4'.
eval(N <- 4, env)
N
get("N", envir = env)
## this version does the assignment in env, and changes N only there.
evalq(N <- 5, env)
N
get("N", envir = env)


##
## Uses of local()
##

# Mutually recursive.
# gg gets value of last assignment, an anonymous version of f.

gg <- local({
    k <- function(y)f(y)
    f <- function(x) if(x) x*k(x-1) else 1
})
gg(10)
sapply(1:5, gg)

# Nesting locals: a is private storage accessible to k
gg <- local({
    k <- local({
        a <- 1
        function(y){print(a <<- a+1);f(y)}
    })
    f <- function(x) if(x) x*k(x-1) else 1
})
sapply(1:5, gg)

ls(envir = environment(gg))
ls(envir = environment(get("k", envir = environment(gg))))



cleanEx()
nameEx("exists")
### * exists

flush(stderr()); flush(stdout())

### Name: exists
### Title: Is an Object Defined?
### Aliases: exists get0
### Keywords: data

### ** Examples

##  Define a substitute function if necessary:
if(!exists("some.fun", mode = "function"))
  some.fun <- function(x) { cat("some.fun(x)\n"); x }
search()
exists("ls", 2) # true even though ls is in pos = 3
exists("ls", 2, inherits = FALSE) # false

## These are true (in most circumstances):
identical(ls,   get0("ls"))
identical(NULL, get0(".foo.bar.")) # default ifnotfound = NULL (!)
## Don't show: 
stopifnot(identical(ls, get0("ls")),
          is.null(get0(".foo.bar.")))
## End(Don't show)



cleanEx()
nameEx("expand.grid")
### * expand.grid

flush(stderr()); flush(stdout())

### Name: expand.grid
### Title: Create a Data Frame from All Combinations of Factor Variables
### Aliases: expand.grid
### Keywords: models array

### ** Examples

require(utils)

expand.grid(height = seq(60, 80, 5), weight = seq(100, 300, 50),
            sex = c("Male","Female"))

x <- seq(0, 10, length.out = 100)
y <- seq(-1, 1, length.out = 20)
d1 <- expand.grid(x = x, y = y)
d2 <- expand.grid(x = x, y = y, KEEP.OUT.ATTRS = FALSE)
object.size(d1) - object.size(d2)
##-> 5992 or 8832 (on 32- / 64-bit platform)
## Don't show: 
stopifnot(object.size(d1) > object.size(d2))
## End(Don't show)



cleanEx()
nameEx("expression")
### * expression

flush(stderr()); flush(stdout())

### Name: expression
### Title: Unevaluated Expressions
### Aliases: expression is.expression as.expression as.expression.default
### Keywords: programming dplot

### ** Examples

length(ex1 <- expression(1 + 0:9)) # 1
ex1
eval(ex1) # 1:10

length(ex3 <- expression(u, 2, u + 0:9)) # 3
mode(ex3 [3])   # expression
mode(ex3[[3]])  # call
## but not all components are 'call's :
sapply(ex3, mode  ) #  name  numeric  call
sapply(ex3, typeof) # symbol  double  language
rm(ex3)



cleanEx()
nameEx("extSoftVersion")
### * extSoftVersion

flush(stderr()); flush(stdout())

### Name: extSoftVersion
### Title: Report Versions of Third-Party Software
### Aliases: extSoftVersion

### ** Examples

extSoftVersion()
## the PCRE version
sub(" .*", "", extSoftVersion()["PCRE"])



cleanEx()
nameEx("factor")
### * factor

flush(stderr()); flush(stdout())

### Name: factor
### Title: Factors
### Aliases: factor ordered is.factor is.ordered as.factor as.ordered
###   is.na<-.factor Math.factor Ops.factor Summary.factor Ops.ordered
###   Summary.ordered addNA .valid.factor c.factor
### Keywords: category NA

### ** Examples

(ff <- factor(substring("statistics", 1:10, 1:10), levels = letters))
as.integer(ff)      # the internal codes
(f. <- factor(ff))  # drops the levels that do not occur
ff[, drop = TRUE]   # the same, more transparently

factor(letters[1:20], labels = "letter")

class(ordered(4:1)) # "ordered", inheriting from "factor"
z <- factor(LETTERS[3:1], ordered = TRUE)
## and "relational" methods work:
stopifnot(sort(z)[c(1,3)] == range(z), min(z) < max(z))
## Don't show: 
of <- ordered(ff)
stopifnot(identical(range(of, rev(of)), of[3:2]),
	  identical(max(of), of[2]))
## End(Don't show)

## suppose you want "NA" as a level, and to allow missing values.
(x <- factor(c(1, 2, NA), exclude = NULL))
is.na(x)[2] <- TRUE
x  # [1] 1    <NA> <NA>
is.na(x)
# [1] FALSE  TRUE FALSE

## More rational, since R 3.4.0 :
factor(c(1:2, NA), exclude =  "" ) # keeps <NA> , as
factor(c(1:2, NA), exclude = NULL) # always did
## exclude = <character>
z # ordered levels 'A < B < C'
factor(z, exclude = "C") # does exclude
factor(z, exclude = "B") # ditto

## Now, labels maybe duplicated:
## factor() with duplicated labels allowing to "merge levels"
x <- c("Man", "Male", "Man", "Lady", "Female")
## Map from 4 different values to only two levels:
(xf <- factor(x, levels = c("Male", "Man" , "Lady",   "Female"),
                 labels = c("Male", "Male", "Female", "Female")))
#> [1] Male   Male   Male   Female Female
#> Levels: Male Female

## Using addNA()
Month <- airquality$Month
table(addNA(Month))
table(addNA(Month, ifany = TRUE))



cleanEx()
nameEx("file.access")
### * file.access

flush(stderr()); flush(stdout())

### Name: file.access
### Title: Ascertain File Accessibility
### Aliases: file.access
### Keywords: file

### ** Examples

fa <- file.access(dir("."))
table(fa) # count successes & failures


cleanEx()
nameEx("file.info")
### * file.info

flush(stderr()); flush(stdout())

### Name: file.info
### Title: Extract File Information
### Aliases: file.info file.mode file.mtime file.size
### Keywords: file

### ** Examples

ncol(finf <- file.info(dir()))  # at least six
## Those that are more than 100 days old :
finf <- file.info(dir(), extra_cols = FALSE)
finf[difftime(Sys.time(), finf[,"mtime"], units = "days") > 100 , 1:4]

file.info("no-such-file-exists")



cleanEx()
nameEx("file.show")
### * file.show

flush(stderr()); flush(stdout())

### Name: file.show
### Title: Display One or More Text Files
### Aliases: file.show
### Keywords: file

### ** Examples

file.show(file.path(R.home("doc"), "COPYRIGHTS"))



cleanEx()
nameEx("files")
### * files

flush(stderr()); flush(stdout())

### Name: files
### Title: File Manipulation
### Aliases: files file.append file.copy file.create file.exists
###   file.remove file.rename file.symlink file.link
### Keywords: file

### ** Examples

## Don't show: 
oldwd <- setwd(tempdir())
## End(Don't show)
cat("file A\n", file = "A")
cat("file B\n", file = "B")
file.append("A", "B")
file.create("A") # (trashing previous)
file.append("A", rep("B", 10))
if(interactive()) file.show("A") # -> the 10 lines from 'B'
file.copy("A", "C")
dir.create("tmp")
file.copy(c("A", "B"), "tmp")
list.files("tmp") # -> "A" and "B"
setwd("tmp")
file.remove("A") # the tmp/A file
file.symlink(file.path("..", c("A", "B")), ".")
                     # |--> (TRUE,FALSE) : ok for A but not B as it exists already
setwd("..")
unlink("tmp", recursive = TRUE)
file.remove("A", "B", "C")
## Don't show: 
setwd(oldwd)
## End(Don't show)



cleanEx()
nameEx("files2")
### * files2

flush(stderr()); flush(stdout())

### Name: files2
### Title: Manipulation of Directories and File Permissions
### Aliases: dir.create dir.exists Sys.chmod Sys.umask umask
### Keywords: file

### ** Examples
## Not run: 
##D ## Fix up maximal allowed permissions in a file tree
##D Sys.chmod(list.dirs("."), "777")
##D f <- list.files(".", all.files = TRUE, full.names = TRUE, recursive = TRUE)
##D Sys.chmod(f, (file.info(f)$mode | "664"))
## End(Not run)


cleanEx()
nameEx("find.package")
### * find.package

flush(stderr()); flush(stdout())

### Name: find.package
### Title: Find Packages
### Aliases: find.package path.package packageNotFoundError
### Keywords: files

### ** Examples

try(find.package("knitr"))
## will not give an error, maybe a warning about *all* locations it is found:
find.package("kitty", quiet=TRUE, verbose=TRUE)

## Find all .libPaths() entries a package is found:
findPkgAll <- function(pkg)
  unlist(lapply(.libPaths(), function(lib)
           find.package(pkg, lib, quiet=TRUE, verbose=FALSE)))

findPkgAll("MASS")
findPkgAll("knitr")



cleanEx()
nameEx("findInterval")
### * findInterval

flush(stderr()); flush(stdout())

### Name: findInterval
### Title: Find Interval Numbers or Indices
### Aliases: findInterval
### Keywords: arith utilities

### ** Examples

x <- 2:18
v <- c(5, 10, 15) # create two bins [5,10) and [10,15)
cbind(x, findInterval(x, v))

N <- 100
X <- sort(round(stats::rt(N, df = 2), 2))
tt <- c(-100, seq(-2, 2, length.out = 201), +100)
it <- findInterval(tt, X)
tt[it < 1 | it >= N] # only first and last are outside range(X)

##  'left.open = TRUE' means  "mirroring" :
N <- length(v)
stopifnot(identical(
                  findInterval( x,  v,  left.open=TRUE) ,
              N - findInterval(-x, -v[N:1])))



cleanEx()
nameEx("force")
### * force

flush(stderr()); flush(stdout())

### Name: force
### Title: Force Evaluation of an Argument
### Aliases: force
### Keywords: data programming

### ** Examples

f <- function(y) function() y
lf <- vector("list", 5)
for (i in seq_along(lf)) lf[[i]] <- f(i)
lf[[1]]()  # returns 5

g <- function(y) { force(y); function() y }
lg <- vector("list", 5)
for (i in seq_along(lg)) lg[[i]] <- g(i)
lg[[1]]()  # returns 1

## This is identical to
g <- function(y) { y; function() y }



cleanEx()
nameEx("formals")
### * formals

flush(stderr()); flush(stdout())

### Name: formals
### Title: Access to and Manipulation of the Formal Arguments
### Aliases: formals formals<-
### Keywords: programming

### ** Examples

require(stats)
formals(lm)

## If you just want the names of the arguments, use formalArgs instead.
names(formals(lm))
methods:: formalArgs(lm)     # same

## formals returns a pairlist. Arguments with no default have type symbol (aka name).
str(formals(lm))

## formals returns NULL for primitive functions.  Use it in combination with
## args for this case.
is.primitive(`+`)
formals(`+`)
formals(args(`+`))

## You can overwrite the formal arguments of a function (though this is
## advanced, dangerous coding).
f <- function(x) a + b
formals(f) <- alist(a = , b = 3)
f    # function(a, b = 3) a + b
f(2) # result = 5



cleanEx()
nameEx("format")
### * format

flush(stderr()); flush(stdout())

### Name: format
### Title: Encode in a Common Format
### Aliases: format format.AsIs format.data.frame format.default
###   format.factor
### Keywords: character print

### ** Examples

format(1:10)
format(1:10, trim = TRUE)

zz <- data.frame("(row names)"= c("aaaaa", "b"), check.names = FALSE)
format(zz)
format(zz, justify = "left")

## use of nsmall
format(13.7)
format(13.7, nsmall = 3)
format(c(6.0, 13.1), digits = 2)
format(c(6.0, 13.1), digits = 2, nsmall = 1)

## use of scientific
format(2^31-1)
format(2^31-1, scientific = TRUE)

## a list
z <- list(a = letters[1:3], b = (-pi+0i)^((-2:2)/2), c = c(1,10,100,1000),
          d = c("a", "longer", "character", "string"),
          q = quote( a + b ), e = expression(1+x))
## can you find the "2" small differences?
(f1 <- format(z, digits = 2))
(f2 <- format(z, digits = 2, justify = "left", trim = FALSE))
f1 == f2 ## 2 FALSE, 4 TRUE

## A "minimal" format() for S4 objects without their own format() method:
cc <- methods::getClassDef("standardGeneric")
format(cc) ## "<S4 class ......>"



cleanEx()
nameEx("format.info")
### * format.info

flush(stderr()); flush(stdout())

### Name: format.info
### Title: format(.) Information
### Aliases: format.info
### Keywords: character print programming

### ** Examples

dd <- options("digits") ; options(digits = 7) #-- for the following
format.info(123)   # 3 0 0
format.info(pi)    # 8 6 0
format.info(1e8)   # 5 0 1 - exponential "1e+08"
format.info(1e222) # 6 0 2 - exponential "1e+222"

x <- pi*10^c(-10,-2,0:2,8,20)
names(x) <- formatC(x, width = 1, digits = 3, format = "g")
cbind(sapply(x, format))
t(sapply(x, format.info))

## using at least 8 digits right of "."
t(sapply(x, format.info, nsmall = 8))

# Reset old options:
options(dd)



cleanEx()
nameEx("format.pval")
### * format.pval

flush(stderr()); flush(stdout())

### Name: format.pval
### Title: Format P Values
### Aliases: format.pval
### Keywords: print

### ** Examples

format.pval(c(stats::runif(5), pi^-100, NA))
format.pval(c(0.1, 0.0001, 1e-27))



cleanEx()
nameEx("formatDL")
### * formatDL

flush(stderr()); flush(stdout())

### Name: formatDL
### Title: Format Description Lists
### Aliases: formatDL
### Keywords: print

### ** Examples

## Provide a nice summary of the numerical characteristics of the
## machine R is running on:
writeLines(formatDL(unlist(.Machine)))
## Inspect Sys.getenv() results in "list" style (by default, these are
## printed in "table" style):
writeLines(formatDL(Sys.getenv(), style = "list"))



cleanEx()
nameEx("formatc")
### * formatc

flush(stderr()); flush(stdout())

### Name: formatC
### Title: Formatting Using C-style Formats
### Aliases: formatC prettyNum .format.zeros
### Keywords: character print

### ** Examples

xx <- pi * 10^(-5:4)
cbind(format(xx, digits = 4), formatC(xx))
cbind(formatC(xx, width = 9, flag = "-"))
cbind(formatC(xx, digits = 5, width = 8, format = "f", flag = "0"))
cbind(format(xx, digits = 4), formatC(xx, digits = 4, format = "fg"))

f <- (-2:4); f <- f*16^f
# Default ("g") format:
formatC(pi*f)
# Fixed ("f") format, more than one flag ('width' partly "enlarged"):
cbind(formatC(pi*f, digits = 3, width=9, format = "f", flag = "0+"))

formatC(    c("a", "Abc", "no way"), width = -7)  # <=> flag = "-"
formatC(c((-1:1)/0,c(1,100)*pi), width = 8, digits = 1)

## note that some of the results here depend on the implementation
## of long-double arithmetic, which is platform-specific.
xx <- c(1e-12,-3.98765e-10,1.45645e-69,1e-70,pi*1e37,3.44e4)
##       1        2             3        4      5       6
formatC(xx)
formatC(xx, format = "fg")       # special "fixed" format.
formatC(xx[1:4], format = "f", digits = 75) #>> even longer strings

formatC(c(3.24, 2.3e-6), format = "f", digits = 11)
formatC(c(3.24, 2.3e-6), format = "f", digits = 11, drop0trailing = TRUE)

r <- c("76491283764.97430", "29.12345678901", "-7.1234", "-100.1","1123")
## American:
prettyNum(r, big.mark = ",")
## Some Europeans:
prettyNum(r, big.mark = "'", decimal.mark = ",")

(dd <- sapply(1:10, function(i) paste((9:0)[1:i], collapse = "")))
prettyNum(dd, big.mark = "'")

## examples of 'small.mark'
pN <- stats::pnorm(1:7, lower.tail = FALSE)
cbind(format (pN, small.mark = " ", digits = 15))
cbind(formatC(pN, small.mark = " ", digits = 17, format = "f"))

cbind(ff <- format(1.2345 + 10^(0:5), width = 11, big.mark = "'"))
## all with same width (one more than the specified minimum)

## individual formatting to common width:
fc <- formatC(1.234 + 10^(0:8), format = "fg", width = 11, big.mark = "'")
cbind(fc)
## Powers of two, stored exactly, formatted individually:
pow.2 <- formatC(2^-(1:32), digits = 24, width = 1, format = "fg")
## nicely printed (the last line showing 5^32 exactly):
noquote(cbind(pow.2))

## complex numbers:
r <- 10.0000001; rv <- (r/10)^(1:10)
(zv <- (rv + 1i*rv))
op <- options(digits = 7) ## (system default)
(pnv <- prettyNum(zv))
stopifnot(pnv == "1+1i", pnv == format(zv),
          pnv == prettyNum(zv, drop0trailing = TRUE))
## more digits change the picture:
options(digits = 8)
head(fv <- format(zv), 3)
prettyNum(fv)
prettyNum(fv, drop0trailing = TRUE) # a bit nicer
options(op)

## The  '  flag :
doLC <- FALSE # <= R warns, so change to TRUE manually if you want see the effect
if(doLC) {
  oldLC <- Sys.getlocale("LC_NUMERIC")
           Sys.setlocale("LC_NUMERIC", "de_CH.UTF-8") }
formatC(1.234 + 10^(0:4), format = "fg", width = 11, flag = "'")
## -->  .....  "      1'001" "     10'001"   on supported platforms
if(doLC) ## revert, typically to  "C"  :
  Sys.setlocale("LC_NUMERIC", oldLC)



cleanEx()
nameEx("function")
### * function

flush(stderr()); flush(stdout())

### Name: function
### Title: Function Definition
### Aliases: function return closure
### Keywords: programming

### ** Examples

norm <- function(x) sqrt(x%*%x)
norm(1:4)

## An anonymous function:
(function(x, y){ z <- x^2 + y^2; x+y+z })(0:7, 1)



cleanEx()
nameEx("funprog")
### * funprog

flush(stderr()); flush(stdout())

### Name: funprog
### Title: Common Higher-Order Functions in Functional Programming
###   Languages
### Aliases: Filter Find Map Negate Reduce Position
### Keywords: programming

### ** Examples

## A general-purpose adder:
add <- function(x) Reduce(`+`, x)
add(list(1, 2, 3))
## Like sum(), but can also used for adding matrices etc., as it will
## use the appropriate '+' method in each reduction step.
## More generally, many generics meant to work on arbitrarily many
## arguments can be defined via reduction:
FOO <- function(...) Reduce(FOO2, list(...))
FOO2 <- function(x, y) UseMethod("FOO2")
## FOO() methods can then be provided via FOO2() methods.

## A general-purpose cumulative adder:
cadd <- function(x) Reduce(`+`, x, accumulate = TRUE)
cadd(seq_len(7))

## A simple function to compute continued fractions:
cfrac <- function(x) Reduce(function(u, v) u + 1 / v, x, right = TRUE)
## Continued fraction approximation for pi:
cfrac(c(3, 7, 15, 1, 292))
## Continued fraction approximation for Euler's number (e):
cfrac(c(2, 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8))

## Map() now recycles similar to basic Ops:
Map(`+`, 1,         1 : 3) ;         1 + 1:3
Map(`+`, numeric(), 1 : 3) ; numeric() + 1:3

## Iterative function application:
Funcall <- function(f, ...) f(...)
## Compute log(exp(acos(cos(0))))
Reduce(Funcall, list(log, exp, acos, cos), 0, right = TRUE)
## n-fold iterate of a function, functional style:
Iterate <- function(f, n = 1)
    function(x) Reduce(Funcall, rep.int(list(f), n), x, right = TRUE)
## Continued fraction approximation to the golden ratio:
Iterate(function(x) 1 + 1 / x, 30)(1)
## which is the same as
cfrac(rep.int(1, 31))
## Computing square root approximations for x as fixed points of the
## function t |-> (t + x / t) / 2, as a function of the initial value:
asqrt <- function(x, n) Iterate(function(t) (t + x / t) / 2, n)
asqrt(2, 30)(10) # Starting from a positive value => +sqrt(2)
asqrt(2, 30)(-1) # Starting from a negative value => -sqrt(2)

## A list of all functions in the base environment:
funs <- Filter(is.function, sapply(ls(baseenv()), get, baseenv()))
## Functions in base with more than 10 arguments:
names(Filter(function(f) length(formals(f)) > 10, funs))
## Number of functions in base with a '...' argument:
length(Filter(function(f)
              any(names(formals(f)) %in% "..."),
              funs))


cleanEx()
nameEx("gc")
### * gc

flush(stderr()); flush(stdout())

### Name: gc
### Title: Garbage Collection
### Aliases: gc gcinfo
### Keywords: environment

### ** Examples


cleanEx()
nameEx("gc.time")
### * gc.time

flush(stderr()); flush(stdout())

### Name: gc.time
### Title: Report Time Spent in Garbage Collection
### Aliases: gc.time
### Keywords: utilities

### ** Examples

gc.time()



cleanEx()
nameEx("get")
### * get

flush(stderr()); flush(stdout())

### Name: get
### Title: Return the Value of a Named Object
### Aliases: get mget dynGet
### Keywords: data

### ** Examples

get("%o%")

## test mget
e1 <- new.env()
mget(letters, e1, ifnotfound = as.list(LETTERS))



cleanEx()
nameEx("getCallingDLL")
### * getCallingDLL

flush(stderr()); flush(stdout())

### Name: getCallingDLL
### Title: Compute DLL for Native Interface Call
### Aliases: getCallingDLL getCallingDLLe
### Keywords: internal

### ** Examples

if(exists("ansari.test"))
   getCallingDLL(ansari.test)



cleanEx()
nameEx("getDLLRegisteredRoutines")
### * getDLLRegisteredRoutines

flush(stderr()); flush(stdout())

### Name: getDLLRegisteredRoutines
### Title: Reflectance Information for C/Fortran routines in a DLL
### Aliases: getDLLRegisteredRoutines getDLLRegisteredRoutines.character
###   getDLLRegisteredRoutines.DLLInfo print.NativeRoutineList
###   print.DLLRegisteredRoutines
### Keywords: interface

### ** Examples

dlls <- getLoadedDLLs()
getDLLRegisteredRoutines(dlls[["base"]])

getDLLRegisteredRoutines("stats")



cleanEx()
nameEx("getLoadedDLLs")
### * getLoadedDLLs

flush(stderr()); flush(stdout())

### Name: getLoadedDLLs
### Title: Get DLLs Loaded in Current Session
### Aliases: getLoadedDLLs print.DLLInfo print.DLLInfoList [.DLLInfoList
###   $.DLLInfo DLLInfo DLLInfoList
### Keywords: interface

### ** Examples

getLoadedDLLs()

utils::tail(getLoadedDLLs(), 2) # the last 2 loaded ones, still a DLLInfoList



cleanEx()
nameEx("gettext")
### * gettext

flush(stderr()); flush(stdout())

### Name: gettext
### Title: Translate Text Messages
### Aliases: gettext ngettext bindtextdomain Sys.setLanguage
### Keywords: utilities character

### ** Examples

bindtextdomain("R")  # non-null if and only if NLS is enabled

for(n in 0:3)
    print(sprintf(ngettext(n, "%d variable has missing values",
                              "%d variables have missing values"),
                  n))

## Not run: 
##D ## for translation, those strings should appear in R-pkg.pot as
##D msgid        "%d variable has missing values"
##D msgid_plural "%d variables have missing values"
##D msgstr[0] ""
##D msgstr[1] ""
## End(Not run)

miss <- "One only" # this line, or the next for the ngettext() below
miss <- c("one", "or", "another")
cat(ngettext(length(miss), "variable", "variables"),
    paste(sQuote(miss), collapse = ", "),
    ngettext(length(miss), "contains", "contain"), "missing values\n")

## better for translators would be to use
cat(sprintf(ngettext(length(miss),
                     "variable %s contains missing values\n",
                     "variables %s contain missing values\n"),
            paste(sQuote(miss), collapse = ", ")))

thisLang <- Sys.getenv("LANGUAGE", unset = NA) # so we can reset it
if(is.na(thisLang) || !nzchar(thisLang)) thisLang <- "en" # "factory" default
enT <- "empty model supplied"
Sys.setenv(LANGUAGE = "de") # may not always 'work'
gettext(enT, domain="R-stats")# "leeres Modell angegeben" (if translation works)
tget <- function() gettext(enT)
tget() # not translated as fn tget() is not from "stats" pkg/namespace
evalq(function() gettext(enT), asNamespace("stats"))() # *is* translated

## Sys.setLanguage()  -- typical usage --
Sys.setLanguage("en") -> oldSet # does set LANGUAGE env.var
errMsg <- function(expr) tryCatch(expr, error=conditionMessage)
(errMsg(1 + "2") -> err)
Sys.setLanguage("fr")
errMsg(1 + "2")
Sys.setLanguage("de")
errMsg(1 + "2")
## Usually, you would reset the language to "previous" via
Sys.setLanguage(oldSet)

## A show off of translations -- platform (font etc) dependent:
## The translation languages available for "base" R in this version of R:
## IGNORE_RDIFF_BEGIN
if(capabilities("NLS")) withAutoprint({
  langs <- list.files(bindtextdomain("R"),
		      pattern = "^[a-z]{2}(_[A-Z]{2}|@quot)?$")
  langs
  txts <- sapply(setNames(,langs),
		 function(lang) { Sys.setLanguage(lang)
				 gettext("incompatible dimensions", domain="R-stats") })
  cbind(txts)
  (nTrans <- length(unique(txts)))
  (not_translated <- names(txts[txts == txts[["en"]]]))
})
## IGNORE_RDIFF_END
## Here, we reset to the *original* setting before the full example started:
if(nzchar(thisLang)) { ## reset to previous and check
  Sys.setLanguage(thisLang)
  stopifnot(identical(errMsg(1 + "2"), err))
} # else staying at 'de' ..



cleanEx()
nameEx("getwd")
### * getwd

flush(stderr()); flush(stdout())

### Name: getwd
### Title: Get or Set Working Directory
### Aliases: getwd setwd
### Keywords: utilities

### ** Examples

(WD <- getwd())
if (!is.null(WD)) setwd(WD)



cleanEx()
nameEx("gl")
### * gl

flush(stderr()); flush(stdout())

### Name: gl
### Title: Generate Factor Levels
### Aliases: gl
### Keywords: category arith

### ** Examples

## First control, then treatment:
gl(2, 8, labels = c("Control", "Treat"))
## 20 alternating 1s and 2s
gl(2, 1, 20)
## alternating pairs of 1s and 2s
gl(2, 2, 20)



cleanEx()
nameEx("grep")
### * grep

flush(stderr()); flush(stdout())

### Name: grep
### Title: Pattern Matching and Replacement
### Aliases: grep grepl sub gsub regexpr gregexpr regexec gregexec
### Keywords: character utilities

### ** Examples

grep("[a-z]", letters)

txt <- c("arm","foot","lefroo", "bafoobar")
if(length(i <- grep("foo", txt)))
   cat("'foo' appears at least once in\n\t", txt, "\n")
i # 2 and 4
txt[i]

## Double all 'a' or 'b's;  "\" must be escaped, i.e., 'doubled'
gsub("([ab])", "\\1_\\1_", "abc and ABC")

txt <- c("The", "licenses", "for", "most", "software", "are",
  "designed", "to", "take", "away", "your", "freedom",
  "to", "share", "and", "change", "it.",
  "", "By", "contrast,", "the", "GNU", "General", "Public", "License",
  "is", "intended", "to", "guarantee", "your", "freedom", "to",
  "share", "and", "change", "free", "software", "--",
  "to", "make", "sure", "the", "software", "is",
  "free", "for", "all", "its", "users")
( i <- grep("[gu]", txt) ) # indices
stopifnot( txt[i] == grep("[gu]", txt, value = TRUE) )

## Note that for some implementations character ranges are
## locale-dependent (but not currently).  Then [b-e] in locales such as
## en_US may include B as the collation order is aAbBcCdDe ...
(ot <- sub("[b-e]",".", txt))
txt[ot != gsub("[b-e]",".", txt)]#- gsub does "global" substitution
## In caseless matching, ranges include both cases:
a <- grep("[b-e]", txt, value = TRUE)
b <- grep("[b-e]", txt, ignore.case = TRUE, value = TRUE)
setdiff(b, a)

txt[gsub("g","#", txt) !=
    gsub("g","#", txt, ignore.case = TRUE)] # the "G" words

regexpr("en", txt)

gregexpr("e", txt)

## Using grepl() for filtering
## Find functions with argument names matching "warn":
findArgs <- function(env, pattern) {
  nms <- ls(envir = as.environment(env))
  nms <- nms[is.na(match(nms, c("F","T")))] # <-- work around "checking hack"
  aa <- sapply(nms, function(.) { o <- get(.)
               if(is.function(o)) names(formals(o)) })
  iw <- sapply(aa, function(a) any(grepl(pattern, a, ignore.case=TRUE)))
  aa[iw]
}
findArgs("package:base", "warn")

## trim trailing white space
str <- "Now is the time      "
sub(" +$", "", str)  ## spaces only
## what is considered 'white space' depends on the locale.
sub("[[:space:]]+$", "", str) ## white space, POSIX-style
## what PCRE considered white space changed in version 8.34: see ?regex
sub("\\s+$", "", str, perl = TRUE) ## PCRE-style white space

## capitalizing
txt <- "a test of capitalizing"
gsub("(\\w)(\\w*)", "\\U\\1\\L\\2", txt, perl=TRUE)
gsub("\\b(\\w)",    "\\U\\1",       txt, perl=TRUE)

txt2 <- "useRs may fly into JFK or laGuardia"
gsub("(\\w)(\\w*)(\\w)", "\\U\\1\\E\\2\\U\\3", txt2, perl=TRUE)
 sub("(\\w)(\\w*)(\\w)", "\\U\\1\\E\\2\\U\\3", txt2, perl=TRUE)

## named capture
notables <- c("  Ben Franklin and Jefferson Davis",
              "\tMillard Fillmore")
# name groups 'first' and 'last'
name.rex <- "(?<first>[[:upper:]][[:lower:]]+) (?<last>[[:upper:]][[:lower:]]+)"
(parsed <- regexpr(name.rex, notables, perl = TRUE))
gregexpr(name.rex, notables, perl = TRUE)[[2]]
parse.one <- function(res, result) {
  m <- do.call(rbind, lapply(seq_along(res), function(i) {
    if(result[i] == -1) return("")
    st <- attr(result, "capture.start")[i, ]
    substring(res[i], st, st + attr(result, "capture.length")[i, ] - 1)
  }))
  colnames(m) <- attr(result, "capture.names")
  m
}
parse.one(notables, parsed)

## Decompose a URL into its components.
## Example by LT (http://www.cs.uiowa.edu/~luke/R/regexp.html).
x <- "http://stat.umn.edu:80/xyz"
m <- regexec("^(([^:]+)://)?([^:/]+)(:([0-9]+))?(/.*)", x)
m
regmatches(x, m)
## Element 3 is the protocol, 4 is the host, 6 is the port, and 7
## is the path.  We can use this to make a function for extracting the
## parts of a URL:
URL_parts <- function(x) {
    m <- regexec("^(([^:]+)://)?([^:/]+)(:([0-9]+))?(/.*)", x)
    parts <- do.call(rbind,
                     lapply(regmatches(x, m), `[`, c(3L, 4L, 6L, 7L)))
    colnames(parts) <- c("protocol","host","port","path")
    parts
}
URL_parts(x)

## gregexec() may match multiple times within a single string.
pattern <- "([[:alpha:]]+)([[:digit:]]+)"
s <- "Test: A1 BC23 DEF456"
m <- gregexec(pattern, s)
m
regmatches(s, m)

## Before gregexec() was implemented, one could emulate it by running
## regexec() on the regmatches obtained via gregexpr().  E.g.:
lapply(regmatches(s, gregexpr(pattern, s)),
       function(e) regmatches(e, regexec(pattern, e)))



cleanEx()
nameEx("grepRaw")
### * grepRaw

flush(stderr()); flush(stdout())

### Name: grepRaw
### Title: Pattern Matching for Raw Vectors
### Aliases: grepRaw
### Keywords: utilities

### ** Examples

grepRaw("no match", "textText")  # integer(0): no match
grepRaw("adf", "adadfadfdfadadf") # 3 - the first match
grepRaw("adf", "adadfadfdfadadf", all=TRUE, fixed=TRUE)
## [1]  3  6 13 -- three matches



cleanEx()
nameEx("groupGeneric")
### * groupGeneric

flush(stderr()); flush(stdout())

### Name: groupGeneric
### Title: S3 Group Generic Functions
### Aliases: S3groupGeneric groupGeneric .Group Math Math.data.frame Ops
###   Ops.data.frame Summary Summary.data.frame Complex 'group generic'
### Keywords: methods

### ** Examples

require(utils)

d.fr <- data.frame(x = 1:9, y = stats::rnorm(9))
class(1 + d.fr) == "data.frame" ##-- add to d.f. ...

methods("Math")
methods("Ops")
methods("Summary")
methods("Complex")  # none in base R



cleanEx()
nameEx("grouping")
### * grouping

flush(stderr()); flush(stdout())

### Name: grouping
### Title: Grouping Permutation
### Aliases: grouping
### Keywords: manip

### ** Examples

(ii <- grouping(x <- c(1, 1, 3:1, 1:4, 3), y <- c(9, 9:1), z <- c(2, 1:9)))
## 6  5  2  1  7  4 10  8  3  9
rbind(x, y, z)[, ii]



cleanEx()
nameEx("gzcon")
### * gzcon

flush(stderr()); flush(stdout())

### Name: gzcon
### Title: (De)compress I/O Through Connections
### Aliases: gzcon
### Keywords: file connection

### ** Examples


## gzfile and gzcon can inter-work.
## Of course here one would use gzfile, but file() can be replaced by
## any other connection generator.
zzfil <- tempfile(fileext = ".gz")
zz <- gzfile(zzfil, "w")
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = zz, sep = "\n")
close(zz)
readLines(zz <- gzcon(file(zzfil, "rb")))
close(zz)
unlink(zzfil)

zzfil2 <- tempfile(fileext = ".gz")
zz <- gzcon(file(zzfil2, "wb"))
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = zz, sep = "\n")
close(zz)
readLines(zz <- gzfile(zzfil2))
close(zz)
unlink(zzfil2)



cleanEx()
nameEx("hexmode")
### * hexmode

flush(stderr()); flush(stdout())

### Name: hexmode
### Title: Integer Numbers Displayed in Hexadecimal
### Aliases: as.hexmode format.hexmode print.hexmode as.character.hexmode
###   [.hexmode !.hexmode |.hexmode &.hexmode hexmode
### Keywords: utilities print

### ** Examples

i <- as.hexmode("7fffffff")
i; class(i)
identical(as.integer(i), .Machine$integer.max)

hm <- as.hexmode(c(NA, 1)); hm
as.integer(hm)

Xm <- as.hexmode(1:16)
Xm # print()s via format()
stopifnot(nchar(format(Xm)) == 2)
Xm[-16] # *no* leading zeroes!
stopifnot(format(Xm[-16]) == c(1:9, letters[1:6]))

## Integer arithmetic (remaining "hexmode"):
16*Xm
Xm^2
-Xm
(fac <- factorial(Xm[1:12])) # !1, !2, !3, !4 .. in hexadecimals
as.integer(fac) # indeed the same as  factorial(1:12)



cleanEx()
nameEx("iconv")
### * iconv

flush(stderr()); flush(stdout())

### Name: iconv
### Title: Convert Character Vector between Encodings
### Aliases: iconv iconvlist
### Keywords: character utilities

### ** Examples

## In principle, as not all systems have iconvlist
try(utils::head(iconvlist(), n = 50))

## Not run: 
##D ## convert from Latin-2 to UTF-8: two of the glibc iconv variants.
##D iconv(x, "ISO_8859-2", "UTF-8")
##D iconv(x, "LATIN2", "UTF-8")
## End(Not run)

## Both x below are in latin1 and will only display correctly in a
## locale that can represent and display latin1.
x <- "fa\xE7ile"
Encoding(x) <- "latin1"
x
charToRaw(xx <- iconv(x, "latin1", "UTF-8"))
xx

iconv(x, "latin1", "ASCII")          #   NA
iconv(x, "latin1", "ASCII", "?")     # "fa?ile"
iconv(x, "latin1", "ASCII", "")      # "faile"
iconv(x, "latin1", "ASCII", "byte")  # "fa<e7>ile"
iconv(xx, "UTF-8", "ASCII", "Unicode") # "fa<U+00E7>ile"
iconv(xx, "UTF-8", "ASCII", "c99")   # "fa\u00E7ile"

## Extracts from old R help files (they are nowadays in UTF-8)
x <- c("Ekstr\xf8m", "J\xf6reskog", "bi\xdfchen Z\xfcrcher")
Encoding(x) <- "latin1"
x
try(iconv(x, "latin1", "ASCII//TRANSLIT"))  # platform-dependent
iconv(x, "latin1", "ASCII", sub = "byte")
## and for Windows' 'Unicode'
str(xx <- iconv(x, "latin1", "UTF-16LE", toRaw = TRUE))
iconv(xx, "UTF-16LE", "UTF-8")



cleanEx()
nameEx("icuSetCollate")
### * icuSetCollate

flush(stderr()); flush(stdout())

### Name: icuSetCollate
### Title: Setup Collation by ICU
### Aliases: icuSetCollate icuGetCollate R_ICU_LOCALE
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("identical")
### * identical

flush(stderr()); flush(stdout())

### Name: identical
### Title: Test Objects for Exact Equality
### Aliases: identical
### Keywords: programming logic iteration

### ** Examples

identical(1, NULL) ## FALSE -- don't try this with ==
identical(1, 1.)   ## TRUE in R (both are stored as doubles)
identical(1, as.integer(1)) ## FALSE, stored as different types

x <- 1.0; y <- 0.99999999999
## how to test for object equality allowing for numeric fuzz :
(E <- all.equal(x, y))
identical(TRUE, E)
isTRUE(E) # alternative test
## If all.equal thinks the objects are different, it returns a
## character string, and the above expression evaluates to FALSE

## even for unusual R objects :
identical(.GlobalEnv, environment())

### ------- Pickyness Flags : -----------------------------

## the infamous example:
identical(0., -0.) # TRUE, i.e. not differentiated
identical(0., -0., num.eq = FALSE)
## similar:
identical(NaN, -NaN) # TRUE
identical(NaN, -NaN, single.NA = FALSE) # differ on bit-level

### For functions ("closure"s): ----------------------------------------------
###     ~~~~~~~~~
f <- function(x) x
f
g <- compiler::cmpfun(f)
g
identical(f, g)                        # TRUE, as bytecode is ignored by default
identical(f, g, ignore.bytecode=FALSE) # FALSE: bytecode differs

## GLM families contain several functions, some of which share an environment:
p1 <- poisson() ; p2 <- poisson()
identical(p1, p2)                          # FALSE
identical(p1, p2, ignore.environment=TRUE) # TRUE

## in interactive use, the 'keep.source' option is typically true:
op <- options(keep.source = TRUE) # and so, these have differing "srcref" :
f1 <- function() {}
f2 <- function() {}
identical(f1,f2)# ignore.srcref= TRUE : TRUE
identical(f1,f2,  ignore.srcref=FALSE)# FALSE
options(op) # revert to previous state

## Don't show: 
m0 <- m <- structure(cbind(I = 1, a = 1:3), foo = "bar", class = "matrix")
attributes(m0) <- rev(attributes(m))
names(attributes(m0)) # 'dim' remains first, interestingly...

stopifnot(identical(0, -0),     !identical(0, -0, num.eq = FALSE),
          identical(NaN, -NaN), !identical(NaN, -NaN, single.NA = FALSE),
          identical(m, m0),     !identical(m, m0, attrib.as.set = FALSE) )
## End(Don't show)



cleanEx()
nameEx("ifelse")
### * ifelse

flush(stderr()); flush(stdout())

### Name: ifelse
### Title: Conditional Element Selection
### Aliases: ifelse
### Keywords: logic programming

### ** Examples

x <- c(6:-4)
sqrt(x)  #- gives warning
sqrt(ifelse(x >= 0, x, NA))  # no warning

## Note: the following also gives the warning !
ifelse(x >= 0, sqrt(x), NA)


## ifelse() strips attributes
## This is important when working with Dates and factors
x <- seq(as.Date("2000-02-29"), as.Date("2004-10-04"), by = "1 month")
## has many "yyyy-mm-29", but a few "yyyy-03-01" in the non-leap years
y <- ifelse(as.POSIXlt(x)$mday == 29, x, NA)
head(y) # not what you expected ... ==> need restore the class attribute:
class(y) <- class(x)
y
## This is a (not atypical) case where it is better *not* to use ifelse(),
## but rather the more efficient and still clear:
y2 <- x
y2[as.POSIXlt(x)$mday != 29] <- NA
## which gives the same as ifelse()+class() hack:
stopifnot(identical(y2, y))


## example of different return modes (and 'test' alone determining length):
yes <- 1:3
no  <- pi^(1:4)
utils::str( ifelse(NA,    yes, no) ) # logical, length 1
utils::str( ifelse(TRUE,  yes, no) ) # integer, length 1
utils::str( ifelse(FALSE, yes, no) ) # double,  length 1



cleanEx()
nameEx("integer")
### * integer

flush(stderr()); flush(stdout())

### Name: integer
### Title: Integer Vectors
### Aliases: integer as.integer is.integer
### Keywords: classes

### ** Examples

## as.integer() truncates:
x <- pi * c(-1:1, 10)
as.integer(x)

is.integer(1) # is FALSE !

is.wholenumber <-
    function(x, tol = .Machine$double.eps^0.5)  abs(x - round(x)) < tol
is.wholenumber(1) # is TRUE
(x <- seq(1, 5, by = 0.5) )
is.wholenumber( x ) #-->  TRUE FALSE TRUE ...



cleanEx()
nameEx("interaction")
### * interaction

flush(stderr()); flush(stdout())

### Name: interaction
### Title: Compute Factor Interactions
### Aliases: interaction
### Keywords: category

### ** Examples

a <- gl(2, 4, 8)
b <- gl(2, 2, 8, labels = c("ctrl", "treat"))
s <- gl(2, 1, 8, labels = c("M", "F"))
interaction(a, b)
interaction(a, b, s, sep = ":")
stopifnot(identical(a:s,
                    interaction(a, s, sep = ":", lex.order = TRUE)),
          identical(a:s:b,
                    interaction(a, s, b, sep = ":", lex.order = TRUE)))



cleanEx()
nameEx("interactive")
### * interactive

flush(stderr()); flush(stdout())

### Name: interactive
### Title: Is R Running Interactively?
### Aliases: interactive
### Keywords: environment programming

### ** Examples

 .First <- function() if(interactive()) x11()



cleanEx()
nameEx("invisible")
### * invisible

flush(stderr()); flush(stdout())

### Name: invisible
### Title: Change the Print Mode to Invisible
### Aliases: invisible
### Keywords: programming

### ** Examples

# These functions both return their argument
f1 <- function(x) x
f2 <- function(x) invisible(x)
f1(1)  # prints
f2(1)  # does not



cleanEx()
nameEx("is.finite")
### * is.finite

flush(stderr()); flush(stdout())

### Name: is.finite
### Title: Finite, Infinite and NaN Numbers
### Aliases: is.finite is.infinite Inf NaN is.nan finite infinite
### Keywords: programming math

### ** Examples

pi / 0 ## = Inf a non-zero number divided by zero creates infinity
0 / 0  ## =  NaN

1/0 + 1/0 # Inf
1/0 - 1/0 # NaN

stopifnot(
    1/0 == Inf,
    1/Inf == 0
)
sin(Inf)
cos(Inf)
tan(Inf)



cleanEx()
nameEx("is.function")
### * is.function

flush(stderr()); flush(stdout())

### Name: is.function
### Title: Is an Object of Type (Primitive) Function?
### Aliases: is.function is.primitive
### Keywords: programming

### ** Examples

is.function(1) # FALSE
is.function (is.primitive) # TRUE: it is a function, but ..
is.primitive(is.primitive) # FALSE: it's not a primitive one, whereas
is.primitive(is.function)  # TRUE: that one *is*



cleanEx()
nameEx("is.language")
### * is.language

flush(stderr()); flush(stdout())

### Name: is.language
### Title: Is an Object a Language Object?
### Aliases: is.language language 'language object' 'language objects'
### Keywords: programming

### ** Examples

ll <- list(a = expression(x^2 - 2*x + 1), b = as.name("Jim"),
           c = as.expression(exp(1)), d = call("sin", pi))
sapply(ll, typeof)
sapply(ll, mode)
stopifnot(sapply(ll, is.language))



cleanEx()
nameEx("is.object")
### * is.object

flush(stderr()); flush(stdout())

### Name: is.object
### Title: Is an Object 'internally classed'?
### Aliases: is.object
### Keywords: methods classes

### ** Examples

is.object(1) # FALSE
is.object(as.factor(1:3)) # TRUE



cleanEx()
nameEx("is.recursive")
### * is.recursive

flush(stderr()); flush(stdout())

### Name: is.recursive
### Title: Is an Object Atomic or Recursive?
### Aliases: is.atomic is.recursive
### Keywords: programming classes

### ** Examples

require(stats)

is.a.r <- function(x) c(is.atomic(x), is.recursive(x))

is.a.r(c(a = 1, b = 3)) # TRUE FALSE
is.a.r(list())          # FALSE TRUE - a list is a list
is.a.r(list(2))         # FALSE TRUE
is.a.r(lm)              # FALSE TRUE
is.a.r(y ~ x)           # FALSE TRUE
is.a.r(expression(x+1)) # FALSE TRUE
is.a.r(quote(exp))      # FALSE FALSE



cleanEx()
nameEx("isR")
### * isR

flush(stderr()); flush(stdout())

### Name: is.R
### Title: Are we using R, rather than S?
### Aliases: is.R
### Keywords: environment utilities

### ** Examples

x <- stats::runif(20); small <- x < 0.4
## In the early years of R, 'which()' only existed in R:
if(is.R()) which(small) else seq(along = small)[small]



cleanEx()
nameEx("isS4")
### * isS4

flush(stderr()); flush(stdout())

### Name: isS4
### Title: Test for an S4 object
### Aliases: isS4 asS4 S4 asS3
### Keywords: programming

### ** Examples

## Don't show: 
require(methods)
## End(Don't show)
isS4(pi) # FALSE
isS4(getClass("MethodDefinition")) # TRUE
## Don't show: 
stopifnot(isS4(asS4(Sys.time())))
## Following is a correction of previous behavior. See note in the
## value section above
stopifnot(isS4(asS4(getClass("MethodDefinition"), FALSE, 2)))
stopifnot(!isS4(asS4(getClass("MethodDefinition"), FALSE, 0)))
## End(Don't show)



cleanEx()
nameEx("isSymmetric")
### * isSymmetric

flush(stderr()); flush(stdout())

### Name: isSymmetric
### Title: Test if a Matrix or other Object is Symmetric (Hermitian)
### Aliases: isSymmetric isSymmetric.matrix
### Keywords: array utilities

### ** Examples

isSymmetric(D3 <- diag(3)) # -> TRUE

D3[2, 1] <- 1e-100
D3
isSymmetric(D3) # TRUE
isSymmetric(D3, tol = 0) # FALSE for zero-tolerance

## Complex Matrices - Hermitian or not
Z <- sqrt(matrix(-1:2 + 0i, 2)); Z <- t(Conj(Z)) %*% Z
Z
isSymmetric(Z)      # TRUE
isSymmetric(Z + 1)  # TRUE
isSymmetric(Z + 1i) # FALSE -- a Hermitian matrix has a *real* diagonal

colnames(D3) <- c("X", "Y", "Z")
isSymmetric(D3)                         # FALSE (as row and column names differ)
isSymmetric(D3, check.attributes=FALSE) # TRUE  (as names are not checked)



cleanEx()
nameEx("jitter")
### * jitter

flush(stderr()); flush(stdout())

### Name: jitter
### Title: 'Jitter' (Add Noise) to Numbers
### Aliases: jitter
### Keywords: dplot utilities

### ** Examples

round(jitter(c(rep(1, 3), rep(1.2, 4), rep(3, 3))), 3)
## These two 'fail' with S-plus 3.x:
jitter(rep(0, 7))
jitter(rep(10000, 5))



cleanEx()
nameEx("kappa")
### * kappa

flush(stderr()); flush(stdout())

### Name: kappa
### Title: Compute or Estimate the Condition Number of a Matrix
### Aliases: rcond kappa kappa.default kappa.lm kappa.qr .kappa_tri
### Keywords: math

### ** Examples

kappa(x1 <- cbind(1, 1:10)) # 15.71
kappa(x1, exact = TRUE)        # 13.68
kappa(x2 <- cbind(x1, 2:11)) # high! [x2 is singular!]

hilbert <- function(n) { i <- 1:n; 1 / outer(i - 1, i, `+`) }
sv9 <- svd(h9 <- hilbert(9))$ d
kappa(h9)  # pretty high!
kappa(h9, exact = TRUE) == max(sv9) / min(sv9)
kappa(h9, exact = TRUE) / kappa(h9)  # 0.677 (i.e., rel.error = 32%)



cleanEx()
nameEx("kronecker")
### * kronecker

flush(stderr()); flush(stdout())

### Name: kronecker
### Title: Kronecker Products on Arrays
### Aliases: kronecker .kronecker %x%
### Keywords: array

### ** Examples

# simple scalar multiplication
( M <- matrix(1:6, ncol = 2) )
kronecker(4, M)
# Block diagonal matrix:
kronecker(diag(1, 3), M)

# ask for dimnames

fred <- matrix(1:12, 3, 4, dimnames = list(LETTERS[1:3], LETTERS[4:7]))
bill <- c("happy" = 100, "sad" = 1000)
kronecker(fred, bill, make.dimnames = TRUE)

bill <- outer(bill, c("cat" = 3, "dog" = 4))
kronecker(fred, bill, make.dimnames = TRUE)



cleanEx()
nameEx("l10n_info")
### * l10n_info

flush(stderr()); flush(stdout())

### Name: l10n_info
### Title: Localization Information
### Aliases: l10n_info
### Keywords: utilities

### ** Examples

l10n_info()



cleanEx()
nameEx("lapply")
### * lapply

flush(stderr()); flush(stdout())

### Name: lapply
### Title: Apply a Function over a List or Vector
### Aliases: lapply sapply vapply replicate simplify2array
### Keywords: iteration list

### ** Examples

require(stats); require(graphics)

x <- list(a = 1:10, beta = exp(-3:3), logic = c(TRUE,FALSE,FALSE,TRUE))
# compute the list mean for each list element
lapply(x, mean)
# median and quartiles for each list element
lapply(x, quantile, probs = 1:3/4)
sapply(x, quantile)
i39 <- sapply(3:9, seq) # list of vectors
sapply(i39, fivenum)
vapply(i39, fivenum,
       c(Min. = 0, "1st Qu." = 0, Median = 0, "3rd Qu." = 0, Max. = 0))

## sapply(*, "array") -- artificial example
(v <- structure(10*(5:8), names = LETTERS[1:4]))
f2 <- function(x, y) outer(rep(x, length.out = 3), y)
(a2 <- sapply(v, f2, y = 2*(1:5), simplify = "array"))
a.2 <- vapply(v, f2, outer(1:3, 1:5), y = 2*(1:5))
stopifnot(dim(a2) == c(3,5,4), all.equal(a2, a.2),
          identical(dimnames(a2), list(NULL,NULL,LETTERS[1:4])))

hist(replicate(100, mean(rexp(10))))

## use of replicate() with parameters:
foo <- function(x = 1, y = 2) c(x, y)
# does not work: bar <- function(n, ...) replicate(n, foo(...))
bar <- function(n, x) replicate(n, foo(x = x))
bar(5, x = 3)



cleanEx()
nameEx("length")
### * length

flush(stderr()); flush(stdout())

### Name: length
### Title: Length of an Object
### Aliases: length length<- length<-.factor
### Keywords: attribute

### ** Examples

length(diag(4))  # = 16 (4 x 4)
length(options())  # 12 or more
length(y ~ x1 + x2 + x3)  # 3
length(expression(x, {y <- x^2; y+2}, x^y))  # 3

## from example(warpbreaks)
require(stats)

fm1 <- lm(breaks ~ wool * tension, data = warpbreaks)
length(fm1$call)      # 3, lm() and two arguments.
length(formula(fm1))  # 3, ~ lhs rhs



cleanEx()
nameEx("lengths")
### * lengths

flush(stderr()); flush(stdout())

### Name: lengths
### Title: Lengths of List or Vector Elements
### Aliases: lengths
### Keywords: attribute

### ** Examples

require(stats)
## summarize by month
l <- split(airquality$Ozone, airquality$Month)
avgOz <- lapply(l, mean, na.rm=TRUE)
## merge result
airquality$avgOz <- rep(unlist(avgOz, use.names=FALSE), lengths(l))
## but this is safer and cleaner, but can be slower
airquality$avgOz <- unsplit(avgOz, airquality$Month)

## should always be true, except when a length does not fit in 32 bits
stopifnot(identical(lengths(l), vapply(l, length, integer(1L))))

## empty lists are not a problem
x <- list()
stopifnot(identical(lengths(x), integer()))

## nor are "list-like" expressions:
lengths(expression(u, v, 1+ 0:9))

## and we should dispatch to length methods
f <- c(rep(1, 3), rep(2, 6), 3)
dates <- split(as.POSIXlt(Sys.time() + 1:10), f)
stopifnot(identical(lengths(dates), vapply(dates, length, integer(1L))))



cleanEx()
nameEx("levels")
### * levels

flush(stderr()); flush(stdout())

### Name: levels
### Title: Levels Attributes
### Aliases: levels levels.default levels<- levels<-.factor
### Keywords: category

### ** Examples

## assign individual levels
x <- gl(2, 4, 8)
levels(x)[1] <- "low"
levels(x)[2] <- "high"
x

## or as a group
y <- gl(2, 4, 8)
levels(y) <- c("low", "high")
y

## combine some levels
z <- gl(3, 2, 12, labels = c("apple", "salad", "orange"))
z
levels(z) <- c("fruit", "veg", "fruit")
z

## same, using a named list
z <- gl(3, 2, 12, labels = c("apple", "salad", "orange"))
z
levels(z) <- list("fruit" = c("apple","orange"),
                  "veg"   = "salad")
z

## we can add levels this way:
f <- factor(c("a","b"))
levels(f) <- c("c", "a", "b")
f

f <- factor(c("a","b"))
levels(f) <- list(C = "C", A = "a", B = "b")
f



cleanEx()
nameEx("libPaths")
### * libPaths

flush(stderr()); flush(stdout())

### Name: libPaths
### Title: Search Paths for Packages
### Aliases: .Library .Library.site .libPaths R_LIBS R_LIBS_SITE
###   R_LIBS_USER .expand_R_libs_env_var
### Keywords: data

### ** Examples

.libPaths()                 # all library trees R knows about



cleanEx()
nameEx("libcurlVersion")
### * libcurlVersion

flush(stderr()); flush(stdout())

### Name: libcurlVersion
### Title: Report Version of libcurl
### Aliases: libcurlVersion

### ** Examples

libcurlVersion()



cleanEx()
nameEx("library")
### * library

flush(stderr()); flush(stdout())

### Name: library
### Title: Loading/Attaching and Listing of Packages
### Aliases: library require conflictRules .noGenerics format.libraryIQR
###   print.libraryIQR format.packageInfo print.packageInfo
### Keywords: data

### ** Examples

library()                   # list all available packages
library(lib.loc = .Library) # list all packages in the default library
library(splines)            # attach package 'splines'
require(splines)            # the same
search()                    # "splines", too
detach("package:splines")

# if the package name is in a character vector, use
pkg <- "splines"
library(pkg, character.only = TRUE)
detach(pos = match(paste("package", pkg, sep = ":"), search()))

require(pkg, character.only = TRUE)
detach(pos = match(paste("package", pkg, sep = ":"), search()))

require(nonexistent)        # FALSE
## Not run: 
##D ## if you want to mask as little as possible, use
##D library(mypkg, pos = "package:base")
## End(Not run)


cleanEx()
nameEx("library.dynam")
### * library.dynam

flush(stderr()); flush(stdout())

### Name: library.dynam
### Title: Loading DLLs from Packages
### Aliases: library.dynam library.dynam.unload .dynLibs
### Keywords: data

### ** Examples

## Which DLLs were dynamically loaded by packages?
library.dynam()

## More on library.dynam.unload() :



cleanEx()
nameEx("list")
### * list

flush(stderr()); flush(stdout())

### Name: list
### Title: Lists - Generic and Dotted Pairs
### Aliases: list pairlist alist as.list as.list.default as.list.data.frame
###   as.list.environment as.list.factor as.list.function as.pairlist
###   is.list is.pairlist
### Keywords: list manip

### ** Examples

require(graphics)

# create a plotting structure
pts <- list(x = cars[,1], y = cars[,2])
plot(pts)

is.pairlist(.Options)  # a user-level pairlist

## "pre-allocate" an empty list of length 5
vector("list", 5)

# Argument lists
f <- function() x
# Note the specification of a "..." argument:
formals(f) <- al <- alist(x = , y = 2+3, ... = )
f
al

## environment->list coercion

e1 <- new.env()
e1$a <- 10
e1$b <- 20
as.list(e1)



cleanEx()
nameEx("list.files")
### * list.files

flush(stderr()); flush(stdout())

### Name: list.files
### Title: List the Files in a Directory/Folder
### Aliases: list.files dir list.dirs
### Keywords: file

### ** Examples

list.files(R.home())
## Only files starting with a-l or r
## Note that a-l is locale-dependent, but using case-insensitive
## matching makes it unambiguous in English locales
dir("../..", pattern = "^[a-lr]", full.names = TRUE, ignore.case = TRUE)

list.dirs(R.home("doc"))
list.dirs(R.home("doc"), full.names = FALSE)



cleanEx()
nameEx("list2DF")
### * list2DF

flush(stderr()); flush(stdout())

### Name: list2DF
### Title: Create Data Frame From List
### Aliases: list2DF
### Keywords: classes

### ** Examples

## Create a data frame holding a list of character vectors and the
## corresponding lengths:
x <- list(character(), "A", c("B", "C"))
n <- lengths(x)
list2DF(list(x = x, n = n))

## Create data frames with no variables and the desired number of rows:
list2DF()
list2DF(nrow = 3L)



cleanEx()
nameEx("list2env")
### * list2env

flush(stderr()); flush(stdout())

### Name: list2env
### Title: From A List, Build or Add To an Environment
### Aliases: list2env
### Keywords: data

### ** Examples

L <- list(a = 1, b = 2:4, p = pi, ff = gl(3, 4, labels = LETTERS[1:3]))
e <- list2env(L)
ls(e)
stopifnot(ls(e) == sort(names(L)),
          identical(L$b, e$b)) # "$" working for environments as for lists

## consistency, when we do the inverse:
ll <- as.list(e)  # -> dispatching to the as.list.environment() method
rbind(names(L), names(ll)) # not in the same order, typically,
                           # but the same content:
stopifnot(identical(L [sort.list(names(L ))],
                    ll[sort.list(names(ll))]))

## now add to e -- can be seen as a fast "multi-assign":
list2env(list(abc = LETTERS, note = "just an example",
              df = data.frame(x = rnorm(20), y = rbinom(20, 1, prob = 0.2))),
         envir = e)
utils::ls.str(e)



cleanEx()
nameEx("load")
### * load

flush(stderr()); flush(stdout())

### Name: load
### Title: Reload Saved Datasets
### Aliases: load
### Keywords: file

### ** Examples

## Don't show: 
oldwd <- setwd(tempdir())
## End(Don't show)

## save all data
xx <- pi # to ensure there is some data
save(list = ls(all.names = TRUE), file= "all.rda")
rm(xx)

## restore the saved values to the current environment
local({
   load("all.rda")
   ls()
})

xx <- exp(1:3)
## restore the saved values to the user's workspace
load("all.rda") ## which is here *equivalent* to
## load("all.rda", .GlobalEnv)
## This however annihilates all objects in .GlobalEnv with the same names !
xx # no longer exp(1:3)
rm(xx)
attach("all.rda") # safer and will warn about masked objects w/ same name in .GlobalEnv
ls(pos = 2)
##  also typically need to cleanup the search path:
detach("file:all.rda")

## clean up (the example):
unlink("all.rda")
## Don't show: 
setwd(oldwd)
## End(Don't show)

## Not run: 
##D con <- url("http://some.where.net/R/data/example.rda")
##D ## print the value to see what objects were created.
##D print(load(con))
##D close(con) # url() always opens the connection
## End(Not run)


cleanEx()
nameEx("locales")
### * locales

flush(stderr()); flush(stdout())

### Name: locales
### Title: Query or Set Aspects of the Locale
### Aliases: locales Sys.getlocale Sys.setlocale .LC.categories LC_ALL
###   LC_COLLATE LC_CTYPE LC_MONETARY LC_NUMERIC LC_TIME LC_MESSAGES
###   LC_PAPER LC_MEASUREMENT
### Keywords: utilities

### ** Examples

Sys.getlocale()
Sys.getlocale("LC_TIME")
## Not run: 
##D Sys.setlocale("LC_TIME", "de")     # Solaris: details are OS-dependent
##D Sys.setlocale("LC_TIME", "de_DE")  # Many Unix-alikes
##D Sys.setlocale("LC_TIME", "de_DE.UTF-8")  # Linux, macOS, other Unix-alikes
##D Sys.setlocale("LC_TIME", "de_DE.utf8")   # some Linux versions
##D Sys.setlocale("LC_TIME", "German.UTF-8") # Windows
## End(Not run)
Sys.getlocale("LC_PAPER")          # may or may not be set
.LC.categories # of length 9 on all platforms

## Not run: 
##D Sys.setlocale("LC_COLLATE", "C")   # turn off locale-specific sorting,
##D                                    # usually (but not on all platforms)
##D Sys.setenv("LANGUAGE" = "es") # set the language for error/warning messages
## End(Not run)



cleanEx()
nameEx("logical")
### * logical

flush(stderr()); flush(stdout())

### Name: logical
### Title: Logical Vectors
### Aliases: logical as.logical as.logical.factor is.logical TRUE FALSE T F
### Keywords: classes logic

### ** Examples

## non-zero values are TRUE
as.logical(c(pi,0))
if (length(letters)) cat("26 is TRUE\n")

## logical interpretation of particular strings
charvec <- c("FALSE", "F", "False", "false",    "fAlse", "0",
             "TRUE",  "T", "True",  "true",     "tRue",  "1")
as.logical(charvec)

## factors are converted via their levels, so string conversion is used
as.logical(factor(charvec))
as.logical(factor(c(0,1)))  # "0" and "1" give NA



cleanEx()
nameEx("lower.tri")
### * lower.tri

flush(stderr()); flush(stdout())

### Name: lower.tri
### Title: Lower and Upper Triangular Part of a Matrix
### Aliases: lower.tri upper.tri
### Keywords: array

### ** Examples

(m2 <- matrix(1:20, 4, 5))
lower.tri(m2)
m2[lower.tri(m2)] <- NA
m2



cleanEx()
nameEx("ls")
### * ls

flush(stderr()); flush(stdout())

### Name: ls
### Title: List Objects
### Aliases: ls objects
### Keywords: environment

### ** Examples

.Ob <- 1
ls(pattern = "O")
ls(pattern= "O", all.names = TRUE)    # also shows ".[foo]"

# shows an empty list because inside myfunc no variables are defined
myfunc <- function() {ls()}
myfunc()

# define a local variable inside myfunc
myfunc <- function() {y <- 1; ls()}
myfunc()                # shows "y"



cleanEx()
nameEx("make.names")
### * make.names

flush(stderr()); flush(stdout())

### Name: make.names
### Title: Make Syntactically Valid Names
### Aliases: make.names
### Keywords: character

### ** Examples

make.names(c("a and b", "a-and-b"), unique = TRUE)
# "a.and.b"  "a.and.b.1"
make.names(c("a and b", "a_and_b"), unique = TRUE)
# "a.and.b"  "a_and_b"
make.names(c("a and b", "a_and_b"), unique = TRUE, allow_ = FALSE)
# "a.and.b"  "a.and.b.1"
make.names(c("", "X"), unique = TRUE)
# "X.1" "X" currently; R up to 3.0.2 gave "X" "X.1"

state.name[make.names(state.name) != state.name] # those 10 with a space



cleanEx()
nameEx("make.unique")
### * make.unique

flush(stderr()); flush(stdout())

### Name: make.unique
### Title: Make Character Strings Unique
### Aliases: make.unique
### Keywords: character

### ** Examples

make.unique(c("a", "a", "a"))
make.unique(c(make.unique(c("a", "a")), "a"))

make.unique(c("a", "a", "a.2", "a"))
make.unique(c(make.unique(c("a", "a")), "a.2", "a"))

## Now show a bit where this is used :
trace(make.unique)
## Applied in data.frame() constructions:
(d1 <- data.frame(x = 1, x = 2, x = 3)) # direct
 d2 <- data.frame(data.frame(x = 1, x = 2), x = 3) # pairwise
stopifnot(identical(d1, d2),
          colnames(d1) == c("x", "x.1", "x.2"))
untrace(make.unique)



cleanEx()
nameEx("mapply")
### * mapply

flush(stderr()); flush(stdout())

### Name: mapply
### Title: Apply a Function to Multiple List or Vector Arguments
### Aliases: mapply .mapply
### Keywords: manip utilities

### ** Examples

mapply(rep, 1:4, 4:1)

mapply(rep, times = 1:4, x = 4:1)

mapply(rep, times = 1:4, MoreArgs = list(x = 42))

mapply(function(x, y) seq_len(x) + y,
       c(a =  1, b = 2, c = 3),  # names from first
       c(A = 10, B = 0, C = -10))

word <- function(C, k) paste(rep.int(C, k), collapse = "")
## names from the first, too:
utils::str(L <- mapply(word, LETTERS[1:6], 6:1, SIMPLIFY = FALSE))

mapply(word, "A", integer()) # gave Error, now list()



cleanEx()
nameEx("marginSums")
### * marginSums

flush(stderr()); flush(stdout())

### Name: marginSums
### Title: Compute table margins
### Aliases: marginSums margin.table
### Keywords: array

### ** Examples

m <- matrix(1:4, 2)
marginSums(m, 1)
marginSums(m, 2)


DF <- as.data.frame(UCBAdmissions)
tbl <- xtabs(Freq ~ Gender + Admit, DF)

marginSums(tbl, "Gender")
proportions(tbl, "Gender")



cleanEx()
nameEx("mat.or.vec")
### * mat.or.vec

flush(stderr()); flush(stdout())

### Name: mat.or.vec
### Title: Create a Matrix or a Vector
### Aliases: mat.or.vec
### Keywords: array

### ** Examples

mat.or.vec(3, 1)
mat.or.vec(3, 2)



cleanEx()
nameEx("match")
### * match

flush(stderr()); flush(stdout())

### Name: match
### Title: Value Matching
### Aliases: match %in%
### Keywords: manip logic

### ** Examples

## The intersection of two sets can be defined via match():
## Simple version:
## intersect <- function(x, y) y[match(x, y, nomatch = 0)]
intersect # the R function in base is slightly more careful
intersect(1:10, 7:20)

1:10 %in% c(1,3,5,9)
sstr <- c("c","ab","B","bba","c",NA,"@","bla","a","Ba","%")
sstr[sstr %in% c(letters, LETTERS)]

"%w/o%" <- function(x, y) x[!x %in% y] #--  x without y
(1:10) %w/o% c(3,7,12)
## Note that setdiff() is very similar and typically makes more sense:
        c(1:6,7:2) %w/o% c(3,7,12)  # -> keeps duplicates
setdiff(c(1:6,7:2),      c(3,7,12)) # -> unique values

## Illuminating example about NA matching
r <- c(1, NA, NaN)
zN <- c(complex(real = NA , imaginary =  r ), complex(real =  r , imaginary = NA ),
        complex(real =  r , imaginary = NaN), complex(real = NaN, imaginary =  r ))
zM <- cbind(Re=Re(zN), Im=Im(zN), match = match(zN, zN))
rownames(zM) <- format(zN)
zM ##--> many "NA's" (= 1) and the four non-NA's (3 different ones, at 7,9,10)

length(zN) # 12
unique(zN) # the "NA" and the 3 different non-NA NaN's
stopifnot(identical(unique(zN), zN[c(1, 7,9,10)]))

## very strict equality would have 4 duplicates (of 12):
symnum(outer(zN, zN, Vectorize(identical,c("x","y")),
                     FALSE,FALSE,FALSE,FALSE))
## removing "(very strictly) duplicates",
i <- c(5,8,11,12)  # we get 8 pairwise non-identicals :
Ixy <- outer(zN[-i], zN[-i], Vectorize(identical,c("x","y")),
                     FALSE,FALSE,FALSE,FALSE)
stopifnot(identical(Ixy, diag(8) == 1))



cleanEx()
nameEx("match.arg")
### * match.arg

flush(stderr()); flush(stdout())

### Name: match.arg
### Title: Argument Verification Using Partial Matching
### Aliases: match.arg
### Keywords: programming

### ** Examples

require(stats)
## Extends the example for 'switch'
center <- function(x, type = c("mean", "median", "trimmed")) {
  type <- match.arg(type)
  switch(type,
         mean = mean(x),
         median = median(x),
         trimmed = mean(x, trim = .1))
}
x <- rcauchy(10)
center(x, "t")       # Works
center(x, "med")     # Works
try(center(x, "m"))  # Error
stopifnot(identical(center(x),       center(x, "mean")),
          identical(center(x, NULL), center(x, "mean")) )

## Allowing more than one 'arg' and hence more than one match:
match.arg(c("gauss", "rect", "ep"),
          c("gaussian", "epanechnikov", "rectangular", "triangular"),
          several.ok = TRUE)
match.arg(c("a", ""),  c("", NA, "bb", "abc"), several.ok=TRUE) # |-->  "abc"



cleanEx()
nameEx("match.call")
### * match.call

flush(stderr()); flush(stdout())

### Name: match.call
### Title: Argument Matching
### Aliases: match.call
### Keywords: programming

### ** Examples

match.call(get, call("get", "abc", i = FALSE, p = 3))
## -> get(x = "abc", pos = 3, inherits = FALSE)
fun <- function(x, lower = 0, upper = 1) {
  structure((x - lower) / (upper - lower), CALL = match.call())
}
fun(4 * atan(1), u = pi)



cleanEx()
nameEx("match.fun")
### * match.fun

flush(stderr()); flush(stdout())

### Name: match.fun
### Title: Extract a Function Specified by Name
### Aliases: match.fun
### Keywords: programming

### ** Examples

# Same as get("*"):
match.fun("*")
# Overwrite outer with a vector
outer <- 1:5
try(match.fun(outer, descend = FALSE)) #-> Error:  not a function
match.fun(outer) # finds it anyway
is.function(match.fun("outer")) # as well



cleanEx()
nameEx("matmult")
### * matmult

flush(stderr()); flush(stdout())

### Name: matmult
### Title: Matrix Multiplication
### Aliases: %*% matmult
### Keywords: array arith

### ** Examples

x <- 1:4
(z <- x %*% x)    # scalar ("inner") product (1 x 1 matrix)
drop(z)             # as scalar

y <- diag(x)
z <- matrix(1:12, ncol = 3, nrow = 4)
y %*% z
y %*% x
x %*% z



cleanEx()
nameEx("matrix")
### * matrix

flush(stderr()); flush(stdout())

### Name: matrix
### Title: Matrices
### Aliases: matrix as.matrix as.matrix.default as.matrix.data.frame
###   is.matrix
### Keywords: array algebra

### ** Examples

is.matrix(as.matrix(1:10))
!is.matrix(warpbreaks)  # data.frame, NOT matrix!
warpbreaks[1:10,]
as.matrix(warpbreaks[1:10,])  # using as.matrix.data.frame(.) method

## Example of setting row and column names
mdat <- matrix(c(1,2,3, 11,12,13), nrow = 2, ncol = 3, byrow = TRUE,
               dimnames = list(c("row1", "row2"),
                               c("C.1", "C.2", "C.3")))
mdat



cleanEx()
nameEx("maxCol")
### * maxCol

flush(stderr()); flush(stdout())

### Name: maxCol
### Title: Find Maximum Position in Matrix
### Aliases: max.col
### Keywords: utilities array

### ** Examples

table(mc <- max.col(swiss))  # mostly "1" and "5", 5 x "2" and once "4"
swiss[unique(print(mr <- max.col(t(swiss)))) , ]  # 3 33 45 45 33 6

set.seed(1)  # reproducible example:
(mm <- rbind(x = round(2*stats::runif(12)),
             y = round(5*stats::runif(12)),
             z = round(8*stats::runif(12))))
## Not run: 
##D   [,1] [,2] [,3] [,4] [,5] [,6] [,7] [,8] [,9] [,10] [,11] [,12]
##D x    1    1    1    2    0    2    2    1    1     0     0     0
##D y    3    2    4    2    4    5    2    4    5     1     3     1
##D z    2    3    0    3    7    3    4    5    4     1     7     5
## End(Not run)
## column indices of all row maxima :
utils::str(lapply(1:3, function(i) which(mm[i,] == max(mm[i,]))))
max.col(mm) ; max.col(mm) # "random"
max.col(mm, "first") # -> 4 6 5
max.col(mm, "last")  # -> 7 9 11
## Don't show: 
stopifnot(max.col(mm, "first") == c(4, 6, 5),
          max.col(mm, "last")  == c(7, 9, 11))
## End(Don't show)



cleanEx()
nameEx("mean")
### * mean

flush(stderr()); flush(stdout())

### Name: mean
### Title: Arithmetic Mean
### Aliases: mean mean.default
### Keywords: univar

### ** Examples

x <- c(0:10, 50)
xm <- mean(x)
c(xm, mean(x, trim = 0.10))

cleanEx()
nameEx("memory.profile")
### * memory.profile

flush(stderr()); flush(stdout())

### Name: memory.profile
### Title: Profile the Usage of Cons Cells
### Aliases: memory.profile
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("merge")
### * merge

flush(stderr()); flush(stdout())

### Name: merge
### Title: Merge Two Data Frames
### Aliases: merge merge.default merge.data.frame
### Keywords: array manip

### ** Examples

authors <- data.frame(
    ## I(*) : use character columns of names to get sensible sort order
    surname = I(c("Tukey", "Venables", "Tierney", "Ripley", "McNeil")),
    nationality = c("US", "Australia", "US", "UK", "Australia"),
    deceased = c("yes", rep("no", 4)))
authorN <- within(authors, { name <- surname; rm(surname) })
books <- data.frame(
    name = I(c("Tukey", "Venables", "Tierney",
             "Ripley", "Ripley", "McNeil", "R Core")),
    title = c("Exploratory Data Analysis",
              "Modern Applied Statistics ...",
              "LISP-STAT",
              "Spatial Statistics", "Stochastic Simulation",
              "Interactive Data Analysis",
              "An Introduction to R"),
    other.author = c(NA, "Ripley", NA, NA, NA, NA,
                     "Venables & Smith"))

(m0 <- merge(authorN, books))
(m1 <- merge(authors, books, by.x = "surname", by.y = "name"))
 m2 <- merge(books, authors, by.x = "name", by.y = "surname")
stopifnot(exprs = {
   identical(m0, m2[, names(m0)])
   as.character(m1[, 1]) == as.character(m2[, 1])
   all.equal(m1[, -1], m2[, -1][ names(m1)[-1] ])
   identical(dim(merge(m1, m2, by = NULL)),
             c(nrow(m1)*nrow(m2), ncol(m1)+ncol(m2)))
})

## "R core" is missing from authors and appears only here :
merge(authors, books, by.x = "surname", by.y = "name", all = TRUE)


## example of using 'incomparables'
x <- data.frame(k1 = c(NA,NA,3,4,5), k2 = c(1,NA,NA,4,5), data = 1:5)
y <- data.frame(k1 = c(NA,2,NA,4,5), k2 = c(NA,NA,3,4,5), data = 1:5)
merge(x, y, by = c("k1","k2")) # NA's match
merge(x, y, by = "k1") # NA's match, so 6 rows
merge(x, y, by = "k2", incomparables = NA) # 2 rows



cleanEx()
nameEx("message")
### * message

flush(stderr()); flush(stdout())

### Name: message
### Title: Diagnostic Messages
### Aliases: message suppressMessages packageStartupMessage
###   .packageStartupMessage suppressPackageStartupMessages .makeMessage
### Keywords: programming

### ** Examples

message("ABC", "DEF")
suppressMessages(message("ABC"))

testit <- function() {
  message("testing package startup messages")
  packageStartupMessage("initializing ...", appendLF = FALSE)
  Sys.sleep(1)
  packageStartupMessage(" done")
}

testit()
suppressPackageStartupMessages(testit())
suppressMessages(testit())



cleanEx()
nameEx("missing")
### * missing

flush(stderr()); flush(stdout())

### Name: missing
### Title: Does a Formal Argument have a Value?
### Aliases: missing
### Keywords: programming

### ** Examples

myplot <- function(x, y) {
                if(missing(y)) {
                        y <- x
                        x <- 1:length(y)
                }
                plot(x, y)
        }



cleanEx()
nameEx("mode")
### * mode

flush(stderr()); flush(stdout())

### Name: mode
### Title: The (Storage) Mode of an Object
### Aliases: mode mode<- storage.mode storage.mode<-
### Keywords: attribute

### ** Examples

require(stats)

sapply(options(), mode)

cex3 <- c("NULL", "1", "1:1", "1i", "list(1)", "data.frame(x = 1)",
  "pairlist(pi)", "c", "lm", "formals(lm)[[1]]",  "formals(lm)[[2]]",
  "y ~ x","expression((1))[[1]]", "(y ~ x)[[1]]",
  "expression(x <- pi)[[1]][[1]]")
lex3 <- sapply(cex3, function(x) eval(str2lang(x)))
mex3 <- t(sapply(lex3,
                 function(x) c(typeof(x), storage.mode(x), mode(x))))
dimnames(mex3) <- list(cex3, c("typeof(.)","storage.mode(.)","mode(.)"))
mex3

## This also makes a local copy of 'pi':
storage.mode(pi) <- "complex"
storage.mode(pi)
rm(pi)



cleanEx()
nameEx("name")
### * name

flush(stderr()); flush(stdout())

### Name: name
### Title: Names and Symbols
### Aliases: name is.symbol as.symbol as.name is.name
### Keywords: programming attribute

### ** Examples

an <- as.name("arrg")
is.name(an) # TRUE
mode(an)   # name
typeof(an) # symbol



cleanEx()
nameEx("names")
### * names

flush(stderr()); flush(stdout())

### Name: names
### Title: The Names of an Object
### Aliases: names names.default names<- names<-.default
### Keywords: attribute

### ** Examples

# print the names attribute of the islands data set
names(islands)

# remove the names attribute
names(islands) <- NULL
islands
rm(islands) # remove the copy made

z <- list(a = 1, b = "c", c = 1:3)
names(z)
# change just the name of the third element.
names(z)[3] <- "c2"
z

z <- 1:3
names(z)
## assign just one name
names(z)[2] <- "b"
z

## Don't show: 
## "show" the equivalence claimed above:
  for(e in c(baseenv(), globalenv()))
  stopifnot(identical(names(e), ls(e, all.names=TRUE, sorted=FALSE)),
            identical(names(e), names(as.list(e, all.names=TRUE))))
## End(Don't show)



cleanEx()
nameEx("nargs")
### * nargs

flush(stderr()); flush(stdout())

### Name: nargs
### Title: The Number of Arguments to a Function
### Aliases: nargs
### Keywords: programming

### ** Examples

tst <- function(a, b = 3, ...) {nargs()}
tst() # 0
tst(clicketyclack) # 1 (even non-existing)
tst(c1, a2, rr3) # 3

foo <- function(x, y, z, w) {
   cat("call was ", deparse(match.call()), "\n", sep = "")
   nargs()
}
foo()      # 0
foo(, , 3) # 3
foo(z = 3) # 1, even though this is the same call

nargs()  # not really meaningful



cleanEx()
nameEx("nchar")
### * nchar

flush(stderr()); flush(stdout())

### Name: nchar
### Title: Count the Number of Characters (or Bytes or Width)
### Aliases: nchar nzchar
### Keywords: character

### ** Examples

x <- c("asfef", "qwerty", "yuiop[", "b", "stuff.blah.yech")
nchar(x)
# 5  6  6  1 15

nchar(deparse(mean))
# 18 17  <-- unless mean differs from base::mean

## NA behaviour as function of keepNA=* :
logi <- setNames(, c(FALSE, NA, TRUE))
sapply(logi, \(k) data.frame(nchar =  nchar (NA, keepNA=k),
                             nzchar = nzchar(NA, keepNA=k)))

x[3] <- NA; x
nchar(x, keepNA= TRUE) #  5  6 NA  1 15
nchar(x, keepNA=FALSE) #  5  6  2  1 15
stopifnot(identical(nchar(x     ), nchar(x, keepNA= TRUE)),
          identical(nchar(x, "w"), nchar(x, keepNA=FALSE)),
          identical(is.na(x), is.na(nchar(x))))

##' nchar() for all three types :
nchars <- function(x, ...)
   vapply(c("chars", "bytes", "width"),
          function(tp) nchar(x, tp, ...), integer(length(x)))

nchars("\u200b") # in R versions (>= 2015-09-xx):
## chars bytes width
##     1     3     0

data.frame(x, nchars(x)) ## all three types : same unless for NA
## force the same by forcing 'keepNA':
(ncT <- nchars(x, keepNA = TRUE)) ## .... NA NA NA ....
(ncF <- nchars(x, keepNA = FALSE))## ....  2  2  2 ....
stopifnot(apply(ncT, 1, function(.) length(unique(.))) == 1,
          apply(ncF, 1, function(.) length(unique(.))) == 1)



cleanEx()
nameEx("nlevels")
### * nlevels

flush(stderr()); flush(stdout())

### Name: nlevels
### Title: The Number of Levels of a Factor
### Aliases: nlevels
### Keywords: category

### ** Examples

nlevels(gl(3, 7)) # = 3



cleanEx()
nameEx("noquote")
### * noquote

flush(stderr()); flush(stdout())

### Name: noquote
### Title: Class for 'no quote' Printing of Character Strings
### Aliases: noquote print.noquote as.matrix.noquote c.noquote [.noquote
### Keywords: print methods utilities

### ** Examples

letters
nql <- noquote(letters)
nql
nql[1:4] <- "oh"
nql[1:12]

cmp.logical <- function(log.v)
{
  ## Purpose: compact printing of logicals
  log.v <- as.logical(log.v)
  noquote(if(length(log.v) == 0)"()" else c(".","|")[1 + log.v])
}
cmp.logical(stats::runif(20) > 0.8)

chmat <- as.matrix(format(stackloss)) # a "typical" character matrix
## noquote(*, right=TRUE)  so it prints exactly like a data frame
chmat <- noquote(chmat, right = TRUE)
chmat
## Don't show: 
stopifnot(identical(
   capture.output(stackloss),
   capture.output(chmat)))
## End(Don't show)



cleanEx()
nameEx("norm")
### * norm

flush(stderr()); flush(stdout())

### Name: norm
### Title: Compute the Norm of a Matrix
### Aliases: norm
### Keywords: math

### ** Examples

(x1 <- cbind(1, 1:10))
norm(x1)
norm(x1, "I")
norm(x1, "M")
stopifnot(all.equal(norm(x1, "F"),
                    sqrt(sum(x1^2))))

hilbert <- function(n) { i <- 1:n; 1 / outer(i - 1, i, `+`) }
h9 <- hilbert(9)
## all 5 types of norm:
(nTyp <- eval(formals(base::norm)$type))
sapply(nTyp, norm, x = h9)



cleanEx()
nameEx("normalizePath")
### * normalizePath

flush(stderr()); flush(stdout())

### Name: normalizePath
### Title: Express File Paths in Canonical Form
### Aliases: normalizePath
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("notyet")
### * notyet

flush(stderr()); flush(stdout())

### Name: NotYet
### Title: Not Yet Implemented Functions and Unused Arguments
### Aliases: NotYetImplemented .NotYetImplemented NotYetUsed .NotYetUsed
### Keywords: documentation utilities

### ** Examples

require(graphics)
barplot(1:5, inside = TRUE) # 'inside' is not yet used



cleanEx()
nameEx("nrow")
### * nrow

flush(stderr()); flush(stdout())

### Name: nrow
### Title: The Number of Rows/Columns of an Array
### Aliases: nrow NROW ncol NCOL
### Keywords: array

### ** Examples

ma <- matrix(1:12, 3, 4)
nrow(ma)   # 3
ncol(ma)   # 4

ncol(array(1:24, dim = 2:4)) # 3, the second dimension
NCOL(1:12) # 1
NROW(1:12) # 12, the length() of the vector

## as.matrix() produces 1-column matrices from 0-length vectors,
## and so does cbind() :
dim(as.matrix(numeric())) # 0 1
dim(    cbind(numeric())) # ditto
## consequently, NCOL(.) gives 1, too :
NCOL(numeric()) # 1 and hence
NCOL(NULL)      # 1



cleanEx()
nameEx("ns-dblcolon")
### * ns-dblcolon

flush(stderr()); flush(stdout())

### Name: ns-dblcolon
### Title: Double Colon and Triple Colon Operators
### Aliases: :: :::
### Keywords: programming

### ** Examples

base::log
base::"+"

## Beware --  use ':::' at your own risk! (see "Details")
stats:::coef.default



cleanEx()
nameEx("ns-internal")
### * ns-internal

flush(stderr()); flush(stdout())

### Name: ns-internals
### Title: Namespace Internals
### Aliases: asNamespace getNamespaceInfo .getNamespaceInfo importIntoEnv
###   isBaseNamespace isNamespace namespaceExport namespaceImport
###   namespaceImportClasses namespaceImportFrom namespaceImportMethods
###   packageHasNamespace parseNamespaceFile registerS3method
###   registerS3methods setNamespaceInfo .__S3MethodsTable__.
###   .mergeExportMethods .mergeImportMethods .knownS3Generics
###   loadingNamespaceInfo .getNamespace .getNamespaceInfo ..getNamespace
###   .S3_methods_table
### Keywords: internal

### ** Examples

nsName <- "stats"
(ns <- asNamespace(nsName)) # <environment: namespace:stats>

## Inverse function of asNamespace() :
environmentName(asNamespace("stats")) # "stats"
environmentName(asNamespace("base"))  # "base"
getNamespaceInfo(ns, "spec")[["name"]] ## -> "stats"
## Don't show: 
stopifnot(identical(nsName,
                      getNamespaceInfo(ns, "spec")[["name"]]))
## End(Don't show)

## Only for for the daring ones, trying to get into the bowels :

lsNamespaceInfo <- function(ns, ...) {
    ns <- asNamespace(ns, base.OK = FALSE)
    ls(..., envir = get(".__NAMESPACE__.", envir = ns, inherits = FALSE))
}
allinfoNS <- function(ns) sapply(lsNamespaceInfo(ns), getNamespaceInfo, ns=ns)

utils::str(allinfoNS("stats"))
utils::str(allinfoNS("stats4"))



cleanEx()
nameEx("ns-load")
### * ns-load

flush(stderr()); flush(stdout())

### Name: ns-load
### Title: Loading and Unloading Name Spaces
### Aliases: attachNamespace loadNamespace requireNamespace
###   loadedNamespaces unloadNamespace isNamespaceLoaded
### Keywords: data utilities

### ** Examples

 (lns <- loadedNamespaces())
 statL <- isNamespaceLoaded("stats")
 stopifnot( identical(statL, "stats" %in% lns) )

 ## The string "foo" and the symbol 'foo' can be used interchangably here:
 stopifnot( identical(isNamespaceLoaded(  "foo"   ), FALSE),
            identical(isNamespaceLoaded(quote(foo)), FALSE),
            identical(isNamespaceLoaded(quote(stats)), statL))

hasS <- isNamespaceLoaded("splines") # (to restore if needed)
Sns <- asNamespace("splines") # loads it if not already
stopifnot(   isNamespaceLoaded("splines"))
unloadNamespace(Sns) # unloading the NS 'object'
stopifnot( ! isNamespaceLoaded("splines"))
if (hasS) loadNamespace("splines") # (restoring previous state)



cleanEx()
nameEx("ns-topenv")
### * ns-topenv

flush(stderr()); flush(stdout())

### Name: ns-topenv
### Title: Top Level Environment
### Aliases: topenv
### Keywords: programming

### ** Examples

topenv(.GlobalEnv)
topenv(new.env()) # also global env
topenv(environment(ls))# namespace:base
topenv(environment(lm))# namespace:stats
## Don't show: 
stopifnot(identical(.GlobalEnv,        topenv(new.env())),
          identical(.GlobalEnv,        topenv(.GlobalEnv)),
          identical(baseenv(),         topenv(baseenv())),
          identical(.BaseNamespaceEnv, topenv(.BaseNamespaceEnv)),
          identical(topenv(environment(ls)), asNamespace("base")),
          identical(topenv(environment(lm)), asNamespace("stats")))
## End(Don't show)



cleanEx()
nameEx("numeric")
### * numeric

flush(stderr()); flush(stdout())

### Name: numeric
### Title: Numeric Vectors
### Aliases: numeric as.numeric is.numeric is.numeric.Date
###   is.numeric.POSIXt
### Keywords: classes attribute

### ** Examples

## Conversion does trim whitespace; non-numeric strings give NA + warning
as.numeric(c("-.1"," 2.7 ","B"))

## Numeric values are sometimes accidentally converted to factors.
## Converting them back to numeric is trickier than you'd expect.
f <- factor(5:10)
as.numeric(f) # not what you might expect, probably not what you want
## what you typically meant and want:
as.numeric(as.character(f))
## the same, considerably more efficient (for long vectors):
as.numeric(levels(f))[f]



cleanEx()
nameEx("numeric_version")
### * numeric_version

flush(stderr()); flush(stdout())

### Name: numeric_version
### Title: Numeric Versions
### Aliases: numeric_version as.numeric_version is.numeric_version
###   package_version is.package_version as.package_version
###   R_system_version getRversion [.numeric_version [<-.numeric_version
###   [[.numeric_version [[<-.numeric_version Ops.numeric_version
###   Summary.numeric_version anyNA.numeric_version
###   as.character.numeric_version as.data.frame.numeric_version
###   as.list.numeric_version c.numeric_version duplicated.numeric_version
###   format.numeric_version is.na.numeric_version is.na<-.numeric_version
###   print.numeric_version rep.numeric_version unique.numeric_version
###   xtfrm.numeric_version $.package_version .encode_numeric_version
###   .decode_numeric_version .make_numeric_version
### Keywords: utilities

### ** Examples

x <- package_version(c("1.2-4", "1.2-3", "2.1"))
x < "1.4-2.3"
c(min(x), max(x))
x[2, 2]
x$major
x$minor

if(getRversion() <= "2.5.0") { ## work around missing feature
  cat("Your version of R, ", as.character(getRversion()),
      ", is outdated.\n",
      "Now trying to work around that ...\n", sep = "")
}

x[[c(1, 3)]]  # '4' as a numeric vector, same as x[1, 3]
x[1, 3]      # 4 as an integer
x[[2, 3]] <- 0   # zero the patchlevel
x[[c(2, 3)]] <- 0 # same
x
x[[3]] <- "2.2.3"; x
x <- c(x, package_version("0.0"))
is.na(x)[4] <- TRUE
stopifnot(identical(is.na(x), c(rep(FALSE,3), TRUE)),
	  anyNA(x))



cleanEx()
nameEx("octmode")
### * octmode

flush(stderr()); flush(stdout())

### Name: octmode
### Title: Integer Numbers Displayed in Octal
### Aliases: as.octmode format.octmode print.octmode as.character.octmode
###   [.octmode !.octmode |.octmode &.octmode octmode
### Keywords: utilities print

### ** Examples

(on <- as.octmode(c(16, 32, 127:129))) # "020" "040" "177" "200" "201"
unclass(on[3:4]) # subsetting

## manipulate file modes
fmode <- as.octmode("170")
(fmode | "644") & "755"

om <- as.octmode(1:12)
om # print()s via format()
stopifnot(nchar(format(om)) == 2)
om[1:7] # *no* leading zeroes!
stopifnot(format(om[1:7]) == as.character(1:7))
om2 <- as.octmode(c(1:10, 60:70))
om2 # prints via format() -> with 3 octals
stopifnot(nchar(format(om2)) == 3)
as.character(om2) # strings of length 1, 2, 3


## Integer arithmetic (remaining "octmode"):
om^2
om * 64
-om
(fac <- factorial(om)) # !1, !2, !3, !4 .. in hexadecimals
as.integer(fac) # indeed the same as  factorial(1:12)



cleanEx()
nameEx("on.exit")
### * on.exit

flush(stderr()); flush(stdout())

### Name: on.exit
### Title: Function Exit Code
### Aliases: on.exit
### Keywords: programming

### ** Examples

require(graphics)

opar <- par(mai = c(1,1,1,1))
on.exit(par(opar))
## Don't show: 
par(opar)
## End(Don't show)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("options")
### * options

flush(stderr()); flush(stdout())

### Name: options
### Title: Options Settings
### Aliases: options .Options getOption option MC_CORES R_C_BOUNDS_CHECK
###   R_DEFAULT_DEVICE R_KEEP_PKG_SOURCE R_INTERACTIVE_DEVICE
### Keywords: environment error print

### ** Examples

op <- options(); utils::str(op) # op is a named list

getOption("width") == options()$width # the latter needs more memory
options(digits = 15)
pi

# set the editor, and save previous value
old.o <- options(editor = "nedit")
old.o

options(check.bounds = TRUE, warn = 1)
x <- NULL; x[4] <- "yes" # gives a warning

options(digits = 5)
print(1e5)
options(scipen = 3); print(1e5)

options(op)     # reset (all) initial options
options("digits")

## Not run: 
##D ## set contrast handling to be like S
##D options(contrasts = c("contr.helmert", "contr.poly"))
## End(Not run)

## Not run: 
##D ## on error, terminate the R session with error status 66
##D options(error = quote(q("no", status = 66, runLast = FALSE)))
##D stop("test it")
## End(Not run)

## Not run: 
##D ## Set error actions for debugging:
##D ## enter browser on error, see ?recover:
##D options(error = recover)
##D ## allows to call debugger() afterwards, see ?debugger:
##D options(error = dump.frames)
##D ## A possible setting for non-interactive sessions
##D options(error = quote({dump.frames(to.file = TRUE); q()}))
## End(Not run)

  # Compare the two ways to get an option and use it
  # acconting for the possibility it might not be set.
if(as.logical(getOption("performCleanp", TRUE)))
   cat("do cleanup\n")

## Not run: 
##D   # a clumsier way of expressing the above w/o the default.
##D tmp <- getOption("performCleanup")
##D if(is.null(tmp))
##D   tmp <- TRUE
##D if(tmp)
##D    cat("do cleanup\n")
## End(Not run)




cleanEx()
nameEx("order")
### * order

flush(stderr()); flush(stdout())

### Name: order
### Title: Ordering Permutation
### Aliases: order sort.list
### Keywords: univar manip

### ** Examples

require(stats)

(ii <- order(x <- c(1,1,3:1,1:4,3), y <- c(9,9:1), z <- c(2,1:9)))
## 6  5  2  1  7  4 10  8  3  9
rbind(x, y, z)[,ii] # shows the reordering (ties via 2nd & 3rd arg)

## Suppose we wanted descending order on y.
## A simple solution for numeric 'y' is
rbind(x, y, z)[, order(x, -y, z)]
## More generally we can make use of xtfrm
cy <- as.character(y)
rbind(x, y, z)[, order(x, -xtfrm(cy), z)]
## The radix sort supports multiple 'decreasing' values:
rbind(x, y, z)[, order(x, cy, z, decreasing = c(FALSE, TRUE, FALSE),
                       method="radix")]

## Sorting data frames:
dd <- transform(data.frame(x, y, z),
                z = factor(z, labels = LETTERS[9:1]))
## Either as above {for factor 'z' : using internal coding}:
dd[ order(x, -y, z), ]
## or along 1st column, ties along 2nd, ... *arbitrary* no.{columns}:
dd[ do.call(order, dd), ]

set.seed(1)  # reproducible example:
d4 <- data.frame(x = round(   rnorm(100)), y = round(10*runif(100)),
                 z = round( 8*rnorm(100)), u = round(50*runif(100)))
(d4s <- d4[ do.call(order, d4), ])
(i <- which(diff(d4s[, 3]) == 0))
#   in 2 places, needed 3 cols to break ties:
d4s[ rbind(i, i+1), ]

## rearrange matched vectors so that the first is in ascending order
x <- c(5:1, 6:8, 12:9)
y <- (x - 5)^2
o <- order(x)
rbind(x[o], y[o])

## tests of na.last
a <- c(4, 3, 2, NA, 1)
b <- c(4, NA, 2, 7, 1)
z <- cbind(a, b)
(o <- order(a, b)); z[o, ]
(o <- order(a, b, na.last = FALSE)); z[o, ]
(o <- order(a, b, na.last = NA)); z[o, ]



cleanEx()
nameEx("outer")
### * outer

flush(stderr()); flush(stdout())

### Name: outer
### Title: Outer Product of Arrays
### Aliases: outer %o%
### Keywords: array

### ** Examples

x <- 1:9; names(x) <- x
# Multiplication & Power Tables
x %o% x
y <- 2:8; names(y) <- paste(y,":", sep = "")
outer(y, x, `^`)

outer(month.abb, 1999:2003, FUN = paste)

## three way multiplication table:
x %o% x %o% y[1:3]



cleanEx()
nameEx("parse")
### * parse

flush(stderr()); flush(stdout())

### Name: parse
### Title: Parse R Expressions
### Aliases: parse str2lang str2expression
### Keywords: file programming connection

### ** Examples

fil <- tempfile(fileext = ".Rdmped")
cat("x <- c(1, 4)\n  x ^ 3 -10 ; outer(1:7, 5:9)\n", file = fil)
# parse 3 statements from our temp file
parse(file = fil, n = 3)
unlink(fil)

## str2lang(<string>)  || str2expression(<character>) :
stopifnot(exprs = {
  identical( str2lang("x[3] <- 1+4"), quote(x[3] <- 1+4))
  identical( str2lang("log(y)"),      quote(log(y)) )
  identical( str2lang("abc"   ),      quote(abc) -> qa)
  is.symbol(qa) & !is.call(qa)           # a symbol/name, not a call
  identical( str2lang("1.375" ), 1.375)  # just a number, not a call
  identical( str2expression(c("# a comment", "", "42")), expression(42) )
})

# A partial parse with a syntax error
txt <- "
x <- 1
an error
"
sf <- srcfile("txt")
try(parse(text = txt, srcfile = sf))
getParseData(sf)



cleanEx()
nameEx("paste")
### * paste

flush(stderr()); flush(stdout())

### Name: paste
### Title: Concatenate Strings
### Aliases: paste paste0
### Keywords: character

### ** Examples

## When passing a single vector, paste0 and paste work like as.character.
paste0(1:12)
paste(1:12)        # same
as.character(1:12) # same

## If you pass several vectors to paste0, they are concatenated in a
## vectorized way.
(nth <- paste0(1:12, c("st", "nd", "rd", rep("th", 9))))

## paste works the same, but separates each input with a space.
## Notice that the recycling rules make every input as long as the longest input.
paste(month.abb, "is the", nth, "month of the year.")
paste(month.abb, letters)

## You can change the separator by passing a sep argument
## which can be multiple characters.
paste(month.abb, "is the", nth, "month of the year.", sep = "_*_")

## To collapse the output into a single string, pass a collapse argument.
paste0(nth, collapse = ", ")

## For inputs of length 1, use the sep argument rather than collapse
paste("1st", "2nd", "3rd", collapse = ", ") # probably not what you wanted
paste("1st", "2nd", "3rd", sep = ", ")

## You can combine the sep and collapse arguments together.
paste(month.abb, nth, sep = ": ", collapse = "; ")

## Using paste() in combination with strwrap() can be useful
## for dealing with long strings.
(title <- paste(strwrap(
    "Stopping distance of cars (ft) vs. speed (mph) from Ezekiel (1930)",
    width = 30), collapse = "\n"))
plot(dist ~ speed, cars, main = title)

## 'recycle0 = TRUE' allows more vectorized behaviour, i.e. zero-length recycling :
valid <- FALSE
val <- pi
paste("The value is", val[valid], "-- not so good!")
paste("The value is", val[valid], "-- good: empty!", recycle0=TRUE) # -> character(0)
## When  'collapse = <string>',  the result is a length-1 string :
paste("foo", {}, "bar", collapse="|")                  # |-->  "foo  bar"
paste("foo", {}, "bar", collapse="|", recycle0 = TRUE) # |-->  ""
## all empty args
paste(	  collapse="|")                  # |-->  ""  as do all these:
paste(	  collapse="|", recycle0 = TRUE)
paste({}, collapse="|")
paste({}, collapse="|", recycle0 = TRUE)



cleanEx()
nameEx("path.expand")
### * path.expand

flush(stderr()); flush(stdout())

### Name: path.expand
### Title: Expand File Paths
### Aliases: path.expand 'tilde expansion'
### Keywords: file

### ** Examples

path.expand("~/foo")



cleanEx()
nameEx("pcre_config")
### * pcre_config

flush(stderr()); flush(stdout())

### Name: pcre_config
### Title: Report Configuration Options for PCRE
### Aliases: pcre_config

### ** Examples

pcre_config()



cleanEx()
nameEx("pipeOp")
### * pipeOp

flush(stderr()); flush(stdout())

### Name: pipeOp
### Title: Forward Pipe Operator
### Aliases: |> pipeOp
### Keywords: programming data

### ** Examples

# simple uses:
mtcars |> head()                      # same as head(mtcars)
mtcars |> head(2)                     # same as head(mtcars, 2)
mtcars |> subset(cyl == 4) |> nrow()  # same as nrow(subset(mtcars, cyl == 4))

# to pass the lhs into an argument other than the first, either
# use the _ placeholder with a named argument:
mtcars |> subset(cyl == 4) |> lm(mpg ~ disp, data = _)
# or use an anonymous function:
mtcars |> subset(cyl == 4) |> (function(d) lm(mpg ~ disp, data = d))()
mtcars |> subset(cyl == 4) |> (\(d) lm(mpg ~ disp, data = d))()
# or explicitly name the argument(s) before the "one":
mtcars |> subset(cyl == 4) |> lm(formula = mpg ~ disp)

# the pipe operator is implemented as a syntax transformation:
quote(mtcars |> subset(cyl == 4) |> nrow())

# regular R evaluation semantics apply
stop() |> (function(...) {})() # stop() is not used on RHS so is not evaluated



cleanEx()
nameEx("plot")
### * plot

flush(stderr()); flush(stdout())

### Name: plot
### Title: Generic X-Y Plotting
### Aliases: plot
### Keywords: hplot

### ** Examples

require(stats) # for lowess, rpois, rnorm
require(graphics) # for plot methods
plot(cars)
lines(lowess(cars))

plot(sin, -pi, 2*pi) # see ?plot.function

## Discrete Distribution Plot:
plot(table(rpois(100, 5)), type = "h", col = "red", lwd = 10,
     main = "rpois(100, lambda = 5)")

## Simple quantiles/ECDF, see ecdf() {library(stats)} for a better one:
plot(x <- sort(rnorm(47)), type = "s", main = "plot(x, type = \"s\")")
points(x, cex = .5, col = "dark red")



cleanEx()
nameEx("pmatch")
### * pmatch

flush(stderr()); flush(stdout())

### Name: pmatch
### Title: Partial String Matching
### Aliases: pmatch
### Keywords: character

### ** Examples

pmatch("", "")                             # returns NA
pmatch("m",   c("mean", "median", "mode")) # returns NA
pmatch("med", c("mean", "median", "mode")) # returns 2

pmatch(c("", "ab", "ab"), c("abc", "ab"), duplicates.ok = FALSE)
pmatch(c("", "ab", "ab"), c("abc", "ab"), duplicates.ok = TRUE)
## compare
charmatch(c("", "ab", "ab"), c("abc", "ab"))



cleanEx()
nameEx("polyroot")
### * polyroot

flush(stderr()); flush(stdout())

### Name: polyroot
### Title: Find Zeros of a Real or Complex Polynomial
### Aliases: polyroot
### Keywords: math

### ** Examples

polyroot(c(1, 2, 1))
round(polyroot(choose(8, 0:8)), 11) # guess what!
for (n1 in 1:4) print(polyroot(1:n1), digits = 4)
polyroot(c(1, 2, 1, 0, 0)) # same as the first



cleanEx()
nameEx("pos.to.env")
### * pos.to.env

flush(stderr()); flush(stdout())

### Name: pos.to.env
### Title: Convert Positions in the Search Path to Environments
### Aliases: pos.to.env
### Keywords: utilities

### ** Examples

pos.to.env(1) # R_GlobalEnv
# the next returns the base environment
pos.to.env(length(search()))



cleanEx()
nameEx("pretty")
### * pretty

flush(stderr()); flush(stdout())

### Name: pretty
### Title: Pretty Breakpoints
### Aliases: pretty .pretty pretty.default
### Keywords: dplot

### ** Examples

pretty(1:15)                    # 0  2  4  6  8 10 12 14 16
pretty(1:15, high.u.bias = 2)   # 0  5 10 15
pretty(1:15, n = 4)             # 0  5 10 15
pretty(1:15 * 2)                # 0  5 10 15 20 25 30
pretty(1:20)                    # 0  5 10 15 20
pretty(1:20, n = 2)             # 0 10 20
pretty(1:20, n = 10)            # 0  2  4 ... 20

for(k in 5:11) {
  cat("k=", k, ": "); print(diff(range(pretty(100 + c(0, pi*10^-k)))))}

##-- more bizarre, when  min(x) == max(x):
pretty(pi)

add.names <- function(v) { names(v) <- paste(v); v}
utils::str(lapply(add.names(-10:20), pretty))
## min.n = 0  returns a length-1 vector "if pretty":
utils::str(lapply(add.names(0:20),  pretty, min.n = 0))
sapply(    add.names(0:20),   pretty, min.n = 4)

pretty(1.234e100)
pretty(1001.1001)
pretty(1001.1001, shrink.sml = 0.2)
for(k in -7:3)
  cat("shrink=", formatC(2^k, width = 9),":",
      formatC(pretty(1001.1001, shrink.sml = 2^k), width = 6),"\n")



cleanEx()
nameEx("print")
### * print

flush(stderr()); flush(stdout())

### Name: print
### Title: Print Values
### Aliases: print print.factor print.function print.listof
###   print.simple.list print.Dlist print.table
### Keywords: print

### ** Examples

require(stats)

ts(1:20)  #-- print is the "Default function" --> print.ts(.) is called
for(i in 1:3) print(1:i)

## Printing of factors
attenu$station ## 117 levels -> 'max.levels' depending on width

## ordered factors: levels  "l1 < l2 < .."
esoph$agegp[1:12]
esoph$alcgp[1:12]

## Printing of sparse (contingency) tables
set.seed(521)
t1 <- round(abs(rt(200, df = 1.8)))
t2 <- round(abs(rt(200, df = 1.4)))
table(t1, t2) # simple
print(table(t1, t2), zero.print = ".") # nicer to read

## same for non-integer "table":
T <- table(t2,t1)
T <- T * (1+round(rlnorm(length(T)))/4)
print(T, zero.print = ".") # quite nicer,
print.table(T[,2:8] * 1e9, digits=3, zero.print = ".")
## still slightly inferior to  Matrix::Matrix(T)  for larger T

## Corner cases with empty extents:
table(1, NA) # < table of extent 1 x 0 >



cleanEx()
nameEx("print.dataframe")
### * print.dataframe

flush(stderr()); flush(stdout())

### Name: print.data.frame
### Title: Printing Data Frames
### Aliases: print.data.frame
### Keywords: print

### ** Examples

(dd <- data.frame(x = 1:8, f = gl(2,4), ch = I(letters[1:8])))
     # print() with defaults
print(dd, quote = TRUE, row.names = FALSE)
     # suppresses row.names and quotes all entries



cleanEx()
nameEx("print.default")
### * print.default

flush(stderr()); flush(stdout())

### Name: print.default
### Title: Default Printing
### Aliases: print.default
### Keywords: print

### ** Examples

pi
print(pi, digits = 16)
LETTERS[1:16]
print(LETTERS, quote = FALSE)

M <- cbind(I = 1, matrix(1:10000, ncol = 10,
                         dimnames = list(NULL, LETTERS[1:10])))
utils::head(M)        # makes more sense than
print(M, max = 1000)  # prints 90 rows and a message about omitting 910



cleanEx()
nameEx("prmatrix")
### * prmatrix

flush(stderr()); flush(stdout())

### Name: prmatrix
### Title: Print Matrices, Old-style
### Aliases: prmatrix
### Keywords: print

### ** Examples

prmatrix(m6 <- diag(6), rowlab = rep("", 6), collab = rep("", 6))

chm <- matrix(scan(system.file("help", "AnIndex", package = "splines"),
                   what = ""), , 2, byrow = TRUE)
chm  # uses print.matrix()
prmatrix(chm, collab = paste("Column", 1:3), right = TRUE, quote = FALSE)



cleanEx()
nameEx("proc.time")
### * proc.time

flush(stderr()); flush(stdout())

### Name: proc.time
### Title: Running Time of R
### Aliases: proc.time print.proc_time summary.proc_time
### Keywords: utilities

### ** Examples


cleanEx()
nameEx("prod")
### * prod

flush(stderr()); flush(stdout())

### Name: prod
### Title: Product of Vector Elements
### Aliases: prod
### Keywords: arith

### ** Examples

print(prod(1:7)) == print(gamma(8))



cleanEx()
nameEx("proportions")
### * proportions

flush(stderr()); flush(stdout())

### Name: proportions
### Title: Express Table Entries as Fraction of Marginal Table
### Aliases: proportions prop.table
### Keywords: array

### ** Examples

m <- matrix(1:4, 2)
m
proportions(m, 1)

DF <- as.data.frame(UCBAdmissions)
tbl <- xtabs(Freq ~ Gender + Admit, DF)

proportions(tbl, "Gender")



cleanEx()
nameEx("pushBack")
### * pushBack

flush(stderr()); flush(stdout())

### Name: pushBack
### Title: Push Text Back on to a Connection
### Aliases: pushBack pushBackLength clearPushBack
### Keywords: connection

### ** Examples

zz <- textConnection(LETTERS)
readLines(zz, 2)
pushBack(c("aa", "bb"), zz)
pushBackLength(zz)
readLines(zz, 1)
pushBackLength(zz)
readLines(zz, 1)
readLines(zz, 1)
close(zz)



cleanEx()
nameEx("qr")
### * qr

flush(stderr()); flush(stdout())

### Name: qr
### Title: The QR Decomposition of a Matrix
### Aliases: qr qr.default qr.coef qr.qy qr.qty qr.resid qr.fitted qr.solve
###   is.qr as.qr solve.qr
### Keywords: algebra array

### ** Examples

hilbert <- function(n) { i <- 1:n; 1 / outer(i - 1, i, `+`) }
h9 <- hilbert(9); h9
qr(h9)$rank           #--> only 7
qrh9 <- qr(h9, tol = 1e-10)
qrh9$rank             #--> 9
##-- Solve linear equation system  H %*% x = y :
y <- 1:9/10
x <- qr.solve(h9, y, tol = 1e-10) # or equivalently :
x <- qr.coef(qrh9, y) #-- is == but much better than
                      #-- solve(h9) %*% y
h9 %*% x              # = y


## overdetermined system
A <- matrix(runif(12), 4)
b <- 1:4
qr.solve(A, b) # or solve(qr(A), b)
solve(qr(A, LAPACK = TRUE), b)
# this is a least-squares solution, cf. lm(b ~ 0 + A)

## underdetermined system
A <- matrix(runif(12), 3)
b <- 1:3
qr.solve(A, b)
solve(qr(A, LAPACK = TRUE), b)
# solutions will have one zero, not necessarily the same one



cleanEx()
nameEx("qraux")
### * qraux

flush(stderr()); flush(stdout())

### Name: QR.Auxiliaries
### Title: Reconstruct the Q, R, or X Matrices from a QR Object
### Aliases: qr.X qr.Q qr.R
### Keywords: algebra array

### ** Examples

p <- ncol(x <- LifeCycleSavings[, -1]) # not the 'sr'
qrstr <- qr(x)   # dim(x) == c(n,p)
qrstr $ rank # = 4 = p
Q <- qr.Q(qrstr) # dim(Q) == dim(x)
R <- qr.R(qrstr) # dim(R) == ncol(x)
X <- qr.X(qrstr) # X == x
range(X - as.matrix(x))  # ~ < 6e-12
## X == Q %*% R if there has been no pivoting, as here:
all.equal(unname(X),
          unname(Q %*% R))

# example of pivoting
x <- cbind(int = 1,
           b1 = rep(1:0, each = 3), b2 = rep(0:1, each = 3),
           c1 = rep(c(1,0,0), 2), c2 = rep(c(0,1,0), 2), c3 = rep(c(0,0,1),2))
x # is singular, columns "b2" and "c3" are "extra"
a <- qr(x)
zapsmall(qr.R(a)) # columns are int b1 c1 c2 b2 c3
a$pivot
pivI <- sort.list(a$pivot) # the inverse permutation
all.equal (x,            qr.Q(a) %*% qr.R(a)) # no, no
stopifnot(
 all.equal(x[, a$pivot], qr.Q(a) %*% qr.R(a)),          # TRUE
 all.equal(x           , qr.Q(a) %*% qr.R(a)[, pivI]))  # TRUE too!



cleanEx()
nameEx("quit")
### * quit

flush(stderr()); flush(stdout())

### Name: quit
### Title: Terminate an R Session
### Aliases: quit q .Last .Last.sys
### Keywords: environment

### ** Examples

## Not run: 
##D ## Unix-flavour example
##D .Last <- function() {
##D   graphics.off() # close devices before printing
##D   cat("Now sending PDF graphics to the printer:\n")
##D   system("lpr Rplots.pdf")
##D   cat("bye bye...\n")
##D }
##D quit("yes")
## End(Not run)



cleanEx()
nameEx("range")
### * range

flush(stderr()); flush(stdout())

### Name: range
### Title: Range of Values
### Aliases: range range.default
### Keywords: univar arith

### ** Examples

(r.x <- range(stats::rnorm(100)))
diff(r.x) # the SAMPLE range

x <- c(NA, 1:3, -1:1/0); x
range(x)
range(x, na.rm = TRUE)
range(x, finite = TRUE)



cleanEx()
nameEx("rank")
### * rank

flush(stderr()); flush(stdout())

### Name: rank
### Title: Sample Ranks
### Aliases: rank
### Keywords: univar

### ** Examples

(r1 <- rank(x1 <- c(3, 1, 4, 15, 92)))
x2 <- c(3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5)
names(x2) <- letters[1:11]
(r2 <- rank(x2)) # ties are averaged

## rank() is "idempotent": rank(rank(x)) == rank(x) :
stopifnot(rank(r1) == r1, rank(r2) == r2)

## ranks without averaging
rank(x2, ties.method= "first")  # first occurrence wins
rank(x2, ties.method= "last")   #  last occurrence wins
rank(x2, ties.method= "random") # ties broken at random
rank(x2, ties.method= "random") # and again

## keep ties ties, no average
(rma <- rank(x2, ties.method= "max"))  # as used classically
(rmi <- rank(x2, ties.method= "min"))  # as in Sports
stopifnot(rma + rmi == round(r2 + r2))

## Comparing all tie.methods:
tMeth <- eval(formals(rank)$ties.method)
rx2 <- sapply(tMeth, function(M) rank(x2, ties.method=M))
cbind(x2, rx2)
## ties.method's does not matter w/o ties:
x <- sample(47)
rx <- sapply(tMeth, function(MM) rank(x, ties.method=MM))
stopifnot(all(rx[,1] == rx))



cleanEx()
nameEx("rapply")
### * rapply

flush(stderr()); flush(stdout())

### Name: rapply
### Title: Recursively Apply a Function to a List
### Aliases: rapply
### Keywords: iteration list

### ** Examples

X <- list(list(a = pi, b = list(c = 1L)), d = "a test")
# the "identity operation":
rapply(X, function(x) x, how = "replace") -> X.; stopifnot(identical(X, X.))
rapply(X, sqrt, classes = "numeric", how = "replace")
rapply(X, deparse, control = "all") # passing extras. argument of deparse()
rapply(X, nchar, classes = "character", deflt = NA_integer_, how = "list")
rapply(X, nchar, classes = "character", deflt = NA_integer_, how = "unlist")
rapply(X, nchar, classes = "character",                      how = "unlist")
rapply(X, log, classes = "numeric", how = "replace", base = 2)

## with expression() / list():
E  <- expression(list(a = pi, b = expression(c = C1 * C2)), d = "a test")
LE <- list(expression(a = pi, b = expression(c = C1 * C2)), d = "a test")
rapply(E, nchar, how="replace") # "expression(c = C1 * C2)" are 23 chars
rapply(E, nchar, classes = "character", deflt = NA_integer_, how = "unlist")
rapply(LE, as.character) # a "pi" | b1 "expression" | b2 "C1 * C2" ..
rapply(LE, nchar)        # (see above)
stopifnot(exprs = {
  identical(E , rapply(E , identity, how = "replace"))
  identical(LE, rapply(LE, identity, how = "replace"))
})



cleanEx()
nameEx("raw")
### * raw

flush(stderr()); flush(stdout())

### Name: raw
### Title: Raw Vectors
### Aliases: raw as.raw is.raw
### Keywords: classes

### ** Examples

xx <- raw(2)
xx[1] <- as.raw(40)     # NB, not just 40.
xx[2] <- charToRaw("A")
xx       ## 28 41   -- raw prints hexadecimals
dput(xx) ## as.raw(c(0x28, 0x41))
as.integer(xx) ## 40 65

x <- "A test string"
(y <- charToRaw(x))
is.vector(y) # TRUE
rawToChar(y)
is.raw(x)
is.raw(y)
stopifnot( charToRaw("\xa3") == as.raw(0xa3) )

isASCII <-  function(txt) all(charToRaw(txt) <= as.raw(127))
isASCII(x)  # true
isASCII("\xa325.63") # false (in Latin-1, this is an amount in UK pounds)



cleanEx()
nameEx("rawConnection")
### * rawConnection

flush(stderr()); flush(stdout())

### Name: rawConnection
### Title: Raw Connections
### Aliases: rawConnection rawConnectionValue
### Keywords: file connection

### ** Examples

zz <- rawConnection(raw(0), "r+") # start with empty raw vector
writeBin(LETTERS, zz)
seek(zz, 0)
readLines(zz) # raw vector has embedded nuls
seek(zz, 0)
writeBin(letters[1:3], zz)
rawConnectionValue(zz)
close(zz)



cleanEx()
nameEx("rawConversion")
### * rawConversion

flush(stderr()); flush(stdout())

### Name: rawConversion
### Title: Convert to or from (Bit/Packed) Raw Vectors
### Aliases: charToRaw rawToChar rawShift rawToBits intToBits packBits
###   numToInts numToBits
### Keywords: classes

### ** Examples

x <- "A test string"
(y <- charToRaw(x))
is.vector(y) # TRUE

rawToChar(y)
rawToChar(y, multiple = TRUE)
(xx <- c(y,  charToRaw("&"), charToRaw(" more")))
rawToChar(xx)

rawShift(y, 1)
rawShift(y,-2)

rawToBits(y)

showBits <- function(r) stats::symnum(as.logical(rawToBits(r)))

z <- as.raw(5)
z ; showBits(z)
showBits(rawShift(z, 1)) # shift to right
showBits(rawShift(z, 2))
showBits(z)
showBits(rawShift(z, -1)) # shift to left
showBits(rawShift(z, -2)) # ..
showBits(rawShift(z, -3)) # shifted off entirely

packBits(as.raw(0:31))
i <- -2:3
stopifnot(exprs = {
  identical(i, packBits(intToBits(i), "integer"))
  identical(packBits(       0:31) ,
            packBits(as.raw(0:31)))
})
str(pBi <- packBits(intToBits(i)))
data.frame(B = matrix(pBi, nrow=6, byrow=TRUE),
           hex = format(as.hexmode(i)), i)


## Look at internal bit representation of ...

## ... of integers :
bitI <- function(x) vapply(as.integer(x), function(x) {
            b <- substr(as.character(rev(intToBits(x))), 2L, 2L)
            paste0(c(b[1L], " ", b[2:32]), collapse = "")
          }, "")
print(bitI(-8:8), width = 35, quote = FALSE)

## ... of double precision numbers in format  'sign exp | mantissa'
## where  1 bit sign  1 <==> "-";
##       11 bit exp   is the base-2 exponent biased by 2^10 - 1 (1023)
##       52 bit mantissa is without the implicit leading '1'
#
## Bit representation  [ sign | exponent | mantissa ] of double prec numbers :

bitC <- function(x) noquote(vapply(as.double(x), function(x) { # split one double
    b <- substr(as.character(rev(numToBits(x))), 2L, 2L)
    paste0(c(b[1L], " ", b[2:12], " | ", b[13:64]), collapse = "")
  }, ""))
bitC(17)
bitC(c(-1,0,1))
bitC(2^(-2:5))
bitC(1+2^-(1:53))# from 0.5 converge to 1

###  numToBits(.)  <==>   intToBits(numToInts(.)) :
d2bI <- function(x) vapply(as.double(x), function(x) intToBits(numToInts(x)), raw(64L))
d2b  <- function(x) vapply(as.double(x), function(x)           numToBits(x) , raw(64L))
set.seed(1)
x <- c(sort(rt(2048, df=1.5)),  2^(-10:10), 1+2^-(1:53))
str(bx <- d2b(x)) # a  64 x 2122  raw matrix
stopifnot( identical(bx, d2bI(x)) )

## Show that  packBits(*, "double")  is the inverse of numToBits() :
packBits(numToBits(pi), type="double")
bitC(2050)
b <- numToBits(2050) 
identical(b, numToBits(packBits(b, type="double")))
pbx <- apply(bx, 2, packBits, type="double")
stopifnot( identical(pbx, x))



cleanEx()
nameEx("readBin")
### * readBin

flush(stderr()); flush(stdout())

### Name: readBin
### Title: Transfer Binary Data To and From Connections
### Aliases: readBin writeBin
### Keywords: file connection

### ** Examples

zzfil <- tempfile("testbin")
zz <- file(zzfil, "wb")
writeBin(1:10, zz)
writeBin(pi, zz, endian = "swap")
writeBin(pi, zz, size = 4)
writeBin(pi^2, zz, size = 4, endian = "swap")
writeBin(pi+3i, zz)
writeBin("A test of a connection", zz)
z <- paste("A very long string", 1:100, collapse = " + ")
writeBin(z, zz)
if(.Machine$sizeof.long == 8 || .Machine$sizeof.longlong == 8)
    writeBin(as.integer(5^(1:10)), zz, size = 8)
if((s <- .Machine$sizeof.longdouble) > 8)
    writeBin((pi/3)^(1:10), zz, size = s)
close(zz)

zz <- file(zzfil, "rb")
readBin(zz, integer(), 4)
readBin(zz, integer(), 6)
readBin(zz, numeric(), 1, endian = "swap")
readBin(zz, numeric(), size = 4)
readBin(zz, numeric(), size = 4, endian = "swap")
readBin(zz, complex(), 1)
readBin(zz, character(), 1)
z2 <- readBin(zz, character(), 1)
if(.Machine$sizeof.long == 8 || .Machine$sizeof.longlong == 8)
    readBin(zz, integer(), 10,  size = 8)
if((s <- .Machine$sizeof.longdouble) > 8)
    readBin(zz, numeric(), 10, size = s)
close(zz)
unlink(zzfil)
stopifnot(z2 == z)

## signed vs unsigned ints
zzfil <- tempfile("testbin")
zz <- file(zzfil, "wb")
x <- as.integer(seq(0, 255, 32))
writeBin(x, zz, size = 1)
writeBin(x, zz, size = 1)
x <- as.integer(seq(0, 60000, 10000))
writeBin(x, zz, size = 2)
writeBin(x, zz, size = 2)
close(zz)
zz <- file(zzfil, "rb")
readBin(zz, integer(), 8, size = 1)
readBin(zz, integer(), 8, size = 1, signed = FALSE)
readBin(zz, integer(), 7, size = 2)
readBin(zz, integer(), 7, size = 2, signed = FALSE)
close(zz)
unlink(zzfil)

## use of raw
z <- writeBin(pi^{1:5}, raw(), size = 4)
readBin(z, numeric(), 5, size = 4)
z <- writeBin(c("a", "test", "of", "character"), raw())
readBin(z, character(), 4)



cleanEx()
nameEx("readChar")
### * readChar

flush(stderr()); flush(stdout())

### Name: readChar
### Title: Transfer Character Strings To and From Connections
### Aliases: readChar writeChar
### Keywords: file connection

### ** Examples

## test fixed-length strings
zzfil <- tempfile("testchar")
zz <- file(zzfil, "wb")
x <- c("a", "this will be truncated", "abc")
nc <- c(3, 10, 3)
writeChar(x, zz, nc, eos = NULL)
writeChar(x, zz, eos = "\r\n")
close(zz)

zz <- file(zzfil, "rb")
readChar(zz, nc)
readChar(zz, nchar(x)+3) # need to read the terminator explicitly
close(zz)
unlink(zzfil)



cleanEx()
nameEx("readLines")
### * readLines

flush(stderr()); flush(stdout())

### Name: readLines
### Title: Read Text Lines from a Connection
### Aliases: readLines
### Keywords: file connection

### ** Examples

fil <- tempfile(fileext = ".data")
cat("TITLE extra line", "2 3 5 7", "", "11 13 17", file = fil,
    sep = "\n")
readLines(fil, n = -1)
unlink(fil) # tidy up

## difference in blocking
fil <- tempfile("test")
cat("123\nabc", file = fil)
readLines(fil) # line with a warning

con <- file(fil, "r", blocking = FALSE)
readLines(con) # empty
cat(" def\n", file = fil, append = TRUE)
readLines(con) # gets both
close(con)

unlink(fil) # tidy up

## Not run: 
##D # read a 'Windows Unicode' file
##D A <- readLines(con <- file("Unicode.txt", encoding = "UCS-2LE"))
##D close(con)
##D unique(Encoding(A)) # will most likely be UTF-8
## End(Not run)


cleanEx()
nameEx("readRDS")
### * readRDS

flush(stderr()); flush(stdout())

### Name: readRDS
### Title: Serialization Interface for Single Objects
### Aliases: readRDS saveRDS infoRDS
### Keywords: file connection

### ** Examples

fil <- tempfile("women", fileext = ".rds")
## save a single object to file
saveRDS(women, fil)
## restore it under a different name
women2 <- readRDS(fil)
identical(women, women2)
## or examine the object via a connection, which will be opened as needed.
con <- gzfile(fil)
readRDS(con)
close(con)

## Less convenient ways to restore the object
## which demonstrate compatibility with unserialize()
con <- gzfile(fil, "rb")
identical(unserialize(con), women)
close(con)
con <- gzfile(fil, "rb")
wm <- readBin(con, "raw", n = 1e4) # size is a guess
close(con)
identical(unserialize(wm), women)

## Format compatibility with serialize():
fil2 <- tempfile("women")
con <- file(fil2, "w")
serialize(women, con) # ASCII, uncompressed
close(con)
identical(women, readRDS(fil2))
fil3 <- tempfile("women")
con <- bzfile(fil3, "w")
serialize(women, con) # binary, bzip2-compressed
close(con)
identical(women, readRDS(fil3))

unlink(c(fil, fil2, fil3))



cleanEx()
nameEx("readRenviron")
### * readRenviron

flush(stderr()); flush(stdout())

### Name: readRenviron
### Title: Set Environment Variables from a File
### Aliases: readRenviron
### Keywords: file

### ** Examples
## Not run: 
##D ## re-read a startup file (or read it in a vanilla session)
##D readRenviron("~/.Renviron")
## End(Not run)


cleanEx()
nameEx("readline")
### * readline

flush(stderr()); flush(stdout())

### Name: readline
### Title: Read a Line from the Terminal
### Aliases: readline
### Keywords: utilities

### ** Examples

fun <- function() {
  ANSWER <- readline("Are you a satisfied R user? ")
  ## a better version would check the answer less cursorily, and
  ## perhaps re-prompt
  if (substr(ANSWER, 1, 1) == "n")
    cat("This is impossible.  YOU LIED!\n")
  else
    cat("I knew it.\n")
}
if(interactive()) fun()



cleanEx()
nameEx("reg.finalizer")
### * reg.finalizer

flush(stderr()); flush(stdout())

### Name: reg.finalizer
### Title: Finalization of Objects
### Aliases: reg.finalizer finalizer
### Keywords: programming environment

### ** Examples

f <- function(e) print("cleaning....")
g <- function(x){ e <- environment(); reg.finalizer(e, f) }
g()
invisible(gc()) # trigger cleanup



cleanEx()
nameEx("regmatches")
### * regmatches

flush(stderr()); flush(stdout())

### Name: regmatches
### Title: Extract or Replace Matched Substrings
### Aliases: regmatches regmatches<-
### Keywords: character utilities

### ** Examples

x <- c("A and B", "A, B and C", "A, B, C and D", "foobar")
pattern <- "[[:space:]]*(,|and)[[:space:]]"
## Match data from regexpr()
m <- regexpr(pattern, x)
regmatches(x, m)
regmatches(x, m, invert = TRUE)
## Match data from gregexpr()
m <- gregexpr(pattern, x)
regmatches(x, m)
regmatches(x, m, invert = TRUE)

## Consider
x <- "John (fishing, hunting), Paul (hiking, biking)"
## Suppose we want to split at the comma (plus spaces) between the
## persons, but not at the commas in the parenthesized hobby lists.
## One idea is to "blank out" the parenthesized parts to match the
## parts to be used for splitting, and extract the persons as the
## non-matched parts.
## First, match the parenthesized hobby lists.
m <- gregexpr("\\([^)]*\\)", x)
## Create blank strings with given numbers of characters.
blanks <- function(n) strrep(" ", n)
## Create a copy of x with the parenthesized parts blanked out.
s <- x
regmatches(s, m) <- Map(blanks, lapply(regmatches(s, m), nchar))
s
## Compute the positions of the split matches (note that we cannot call
## strsplit() on x with match data from s).
m <- gregexpr(", *", s)
## And finally extract the non-matched parts.
regmatches(x, m, invert = TRUE)

## regexec() and gregexec() return overlapping ranges because the
## first match is the full match.  This conflicts with regmatches()<-
## and regmatches(..., invert=TRUE).  We can work-around by dropping
## the first match.
drop_first <- function(x) {
    if(!anyNA(x) && all(x > 0)) {
        ml <- attr(x, 'match.length')
        if(is.matrix(x)) x <- x[-1,] else x <- x[-1]
        attr(x, 'match.length') <- if(is.matrix(ml)) ml[-1,] else ml[-1]
    }
    x
}
m <- gregexec("(\\w+) \\(((?:\\w+(?:, )?)+)\\)", x)
regmatches(x, m)
try(regmatches(x, m, invert=TRUE))
regmatches(x, lapply(m, drop_first))
## invert=TRUE loses matrix structure because we are retrieving what
## is in between every sub-match
regmatches(x, lapply(m, drop_first), invert=TRUE)
y <- z <- x
## Notice **list**(...) on the RHS
regmatches(y, lapply(m, drop_first)) <- list(c("<NAME>", "<HOBBY-LIST>"))
y
regmatches(z, lapply(m, drop_first), invert=TRUE) <-
    list(sprintf("<%d>", 1:5))
z


cleanEx()
nameEx("rep")
### * rep

flush(stderr()); flush(stdout())

### Name: rep
### Title: Replicate Elements of Vectors and Lists
### Aliases: rep rep.factor rep.int rep.POSIXct rep.POSIXlt rep.Date
###   rep_len
### Keywords: manip chron

### ** Examples

rep(1:4, 2)
rep(1:4, each = 2)       # not the same.
rep(1:4, c(2,2,2,2))     # same as second.
rep(1:4, c(2,1,2,1))
rep(1:4, each = 2, length.out = 4)    # first 4 only.
rep(1:4, each = 2, length.out = 10)   # 8 integers plus two recycled 1's.
rep(1:4, each = 2, times = 3)         # length 24, 3 complete replications

rep(1, 40*(1-.8)) # length 7 on most platforms
rep(1, 40*(1-.8)+1e-7) # better

## replicate a list
fred <- list(happy = 1:10, name = "squash")
rep(fred, 5)

# date-time objects
x <- .leap.seconds[1:3]
rep(x, 2)
rep(as.POSIXlt(x), rep(2, 3))

## named factor
x <- factor(LETTERS[1:4]); names(x) <- letters[1:4]
x
rep(x, 2)
rep(x, each = 2)
rep.int(x, 2)  # no names
rep_len(x, 10)



cleanEx()
nameEx("rev")
### * rev

flush(stderr()); flush(stdout())

### Name: rev
### Title: Reverse Elements
### Aliases: rev rev.default
### Keywords: manip

### ** Examples

x <- c(1:5, 5:3)
## sort into descending order; first more efficiently:
stopifnot(sort(x, decreasing = TRUE) == rev(sort(x)))
stopifnot(rev(1:7) == 7:1)  #- don't need 'rev' here



cleanEx()
nameEx("rle")
### * rle

flush(stderr()); flush(stdout())

### Name: rle
### Title: Run Length Encoding
### Aliases: rle inverse.rle print.rle
### Keywords: manip

### ** Examples

x <- rev(rep(6:10, 1:5))
rle(x)
## lengths [1:5]  5 4 3 2 1
## values  [1:5] 10 9 8 7 6

z <- c(TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, TRUE, TRUE, TRUE)
rle(z)
rle(as.character(z))
print(rle(z), prefix = "..| ")

N <- integer(0)
stopifnot(x == inverse.rle(rle(x)),
          identical(N, inverse.rle(rle(N))),
          z == inverse.rle(rle(z)))



cleanEx()
nameEx("rm")
### * rm

flush(stderr()); flush(stdout())

### Name: remove
### Title: Remove Objects from a Specified Environment
### Aliases: rm remove
### Keywords: environment

### ** Examples

tmp <- 1:4
## work with tmp  and cleanup
rm(tmp)

## Not run: 
##D ## remove (almost) everything in the working environment.
##D ## You will get no warning, so don't do this unless you are really sure.
##D rm(list = ls())
## End(Not run)


cleanEx()
nameEx("round.POSIXt")
### * round.POSIXt

flush(stderr()); flush(stdout())

### Name: round.POSIXt
### Title: Round / Truncate Date-Time Objects
### Aliases: round.POSIXt trunc.POSIXt round.Date trunc.Date
### Keywords: chron

### ** Examples

round(.leap.seconds + 1000, "hour")
## IGNORE_RDIFF_BEGIN
         trunc(Sys.time(), "day")
(timM <- trunc(Sys.time() -> St, "months")) # shows timezone
(datM <- trunc(Sys.Date() -> Sd, "months"))
(timY <- trunc(St, "years")) # + timezone
(datY <- trunc(Sd, "years"))
## IGNORE_RDIFF_END
stopifnot(inherits(datM, "Date"), inherits(timM, "POSIXt"),
          substring(format(datM), 9,10) == "01", # first of month
          substring(format(datY), 6,10) == "01-01", # Jan 1
          identical(format(datM), format(timM)),
          identical(format(datY), format(timY)))



cleanEx()
nameEx("row")
### * row

flush(stderr()); flush(stdout())

### Name: row
### Title: Row Indexes
### Aliases: row .row
### Keywords: array

### ** Examples

x <- matrix(1:12, 3, 4)
# extract the diagonal of a matrix - more slowly than diag(x)
dx <- x[row(x) == col(x)]
dx

# create an identity 5-by-5 matrix more slowly than diag(n = 5):
x <- matrix(0, nrow = 5, ncol = 5)
x[row(x) == col(x)] <- 1
x

(i34 <- .row(3:4))
stopifnot(identical(i34, .row(c(3,4)))) # 'dim' maybe "double"



cleanEx()
nameEx("row.names")
### * row.names

flush(stderr()); flush(stdout())

### Name: row.names
### Title: Get and Set Row Names for Data Frames
### Aliases: row.names row.names.data.frame row.names.default row.names<-
###   row.names<-.data.frame row.names<-.default .rowNamesDF<-
### Keywords: classes methods

### ** Examples

## To illustrate the note:
df <- data.frame(x = c(TRUE, FALSE, NA, NA), y = c(12, 34, 56, 78))
row.names(df) <- 1 : 4
attr(df, "row.names") #> 1:4
deparse(df) # or dput(df)
##--> c(NA, 4L) : Compact storage, *not* regarded as automatic.

row.names(df) <- NULL
attr(df, "row.names") #> 1:4
deparse(df) # or dput(df) -- shows
##--> c(NA, -4L) : Compact storage, regarded as automatic.



cleanEx()
nameEx("rowsum")
### * rowsum

flush(stderr()); flush(stdout())

### Name: rowsum
### Title: Give Column Sums of a Matrix or Data Frame, Based on a Grouping
###   Variable
### Aliases: rowsum rowsum.default rowsum.data.frame
### Keywords: manip

### ** Examples

require(stats)

x <- matrix(runif(100), ncol = 5)
group <- sample(1:8, 20, TRUE)
(xsum <- rowsum(x, group))
## Slower versions
tapply(x, list(group[row(x)], col(x)), sum)
t(sapply(split(as.data.frame(x), group), colSums))
aggregate(x, list(group), sum)[-1]



cleanEx()
nameEx("sQuote")
### * sQuote

flush(stderr()); flush(stdout())

### Name: sQuote
### Title: Quote Text
### Aliases: sQuote dQuote
### Keywords: character

### ** Examples

op <- options("useFancyQuotes")
paste("argument", sQuote("x"), "must be non-zero")
options(useFancyQuotes = FALSE)
cat("\ndistinguish plain", sQuote("single"), "and",
    dQuote("double"), "quotes\n")
options(useFancyQuotes = TRUE)
cat("\ndistinguish fancy", sQuote("single"), "and",
    dQuote("double"), "quotes\n")
options(useFancyQuotes = "TeX")
cat("\ndistinguish TeX", sQuote("single"), "and",
    dQuote("double"), "quotes\n")
if(l10n_info()$`Latin-1`) {
    options(useFancyQuotes = c("\xab", "\xbb", "\xbf", "?"))
    cat("\n", sQuote("guillemet"), "and",
        dQuote("Spanish question"), "styles\n")
} else if(l10n_info()$`UTF-8`) {
    options(useFancyQuotes = c("\xc2\xab", "\xc2\xbb", "\xc2\xbf", "?"))
    cat("\n", sQuote("guillemet"), "and",
        dQuote("Spanish question"), "styles\n")
}
options(op)



cleanEx()
nameEx("sample")
### * sample

flush(stderr()); flush(stdout())

### Name: sample
### Title: Random Samples and Permutations
### Aliases: sample sample.int
### Keywords: distribution

### ** Examples

x <- 1:12
# a random permutation
sample(x)
# bootstrap resampling -- only if length(x) > 1 !
sample(x, replace = TRUE)

# 100 Bernoulli trials
sample(c(0,1), 100, replace = TRUE)

## More careful bootstrapping --  Consider this when using sample()
## programmatically (i.e., in your function or simulation)!

# sample()'s surprise -- example
x <- 1:10
    sample(x[x >  8]) # length 2
    sample(x[x >  9]) # oops -- length 10!
    sample(x[x > 10]) # length 0

## safer version:
resample <- function(x, ...) x[sample.int(length(x), ...)]
resample(x[x >  8]) # length 2
resample(x[x >  9]) # length 1
resample(x[x > 10]) # length 0

## R 3.0.0 and later
sample.int(1e10, 12, replace = TRUE)
sample.int(1e10, 12) # not that there is much chance of duplicates



cleanEx()
nameEx("save")
### * save

flush(stderr()); flush(stdout())

### Name: save
### Title: Save R Objects
### Aliases: save save.image
### Keywords: file

### ** Examples

## Don't show: 
oldwd <- setwd(tempdir()) # so examples do write there
## End(Don't show)
x <- stats::runif(20)
y <- list(a = 1, b = TRUE, c = "oops")
save(x, y, file = "xy.RData")
save.image() # creating ".RData" in current working directory
unlink("xy.RData")

# set save defaults using option:
options(save.defaults = list(ascii = TRUE, safe = FALSE))
save.image() # creating ".RData"
if(interactive()) withAutoprint({
   file.info(".RData")
   readLines(".RData", n = 7) # first 7 lines; first starts w/ "RDA"..
})
unlink(".RData")
## Don't show: 
setwd(oldwd)
## End(Don't show)



cleanEx()
nameEx("scale")
### * scale

flush(stderr()); flush(stdout())

### Name: scale
### Title: Scaling and Centering of Matrix-like Objects
### Aliases: scale scale.default
### Keywords: array

### ** Examples

require(stats)
x <- matrix(1:10, ncol = 2)
(centered.x <- scale(x, scale = FALSE))
cov(centered.scaled.x <- scale(x)) # all 1



cleanEx()
nameEx("scan")
### * scan

flush(stderr()); flush(stdout())

### Name: scan
### Title: Read Data Values
### Aliases: scan
### Keywords: file connection

### ** Examples

cat("TITLE extra line", "2 3 5 7", "11 13 17", file = "ex.data", sep = "\n")
pp <- scan("ex.data", skip = 1, quiet = TRUE)
scan("ex.data", skip = 1)
scan("ex.data", skip = 1, nlines = 1) # only 1 line after the skipped one
scan("ex.data", what = list("","","")) # flush is F -> read "7"
scan("ex.data", what = list("","",""), flush = TRUE)
unlink("ex.data") # tidy up

## "inline" usage
scan(text = "1 2 3")




cleanEx()
nameEx("search")
### * search

flush(stderr()); flush(stdout())

### Name: search
### Title: Give Search Path for R Objects
### Aliases: search searchpaths .rmpkg
### Keywords: data

### ** Examples

search()
searchpaths()



cleanEx()
nameEx("seq.Date")
### * seq.Date

flush(stderr()); flush(stdout())

### Name: seq.Date
### Title: Generate Regular Sequences of Dates
### Aliases: seq.Date
### Keywords: manip chron

### ** Examples

## first days of years
seq(as.Date("1910/1/1"), as.Date("1999/1/1"), "years")
## by month
seq(as.Date("2000/1/1"), by = "month", length.out = 12)
## quarters
seq(as.Date("2000/1/1"), as.Date("2003/1/1"), by = "quarter")

## find all 7th of the month between two dates, the last being a 7th.
st <- as.Date("1998-12-17")
en <- as.Date("2000-1-7")
ll <- seq(en, st, by = "-1 month")
rev(ll[ll > st & ll < en])



cleanEx()
nameEx("seq.POSIXt")
### * seq.POSIXt

flush(stderr()); flush(stdout())

### Name: seq.POSIXt
### Title: Generate Regular Sequences of Times
### Aliases: seq.POSIXt
### Keywords: manip chron

### ** Examples

## first days of years
seq(ISOdate(1910,1,1), ISOdate(1999,1,1), "years")
## by month
seq(ISOdate(2000,1,1), by = "month", length.out = 12)
seq(ISOdate(2000,1,31), by = "month", length.out = 4)
## quarters
seq(ISOdate(1990,1,1), ISOdate(2000,1,1), by = "quarter") # or "3 months"
## days vs DSTdays: use c() to lose the time zone.
seq(c(ISOdate(2000,3,20)), by = "day", length.out = 10)
seq(c(ISOdate(2000,3,20)), by = "DSTday", length.out = 10)
seq(c(ISOdate(2000,3,20)), by = "7 DSTdays", length.out = 4)



cleanEx()
nameEx("seq")
### * seq

flush(stderr()); flush(stdout())

### Name: seq
### Title: Sequence Generation
### Aliases: seq seq.default seq.int seq_along seq_len
### Keywords: manip

### ** Examples

seq(0, 1, length.out = 11)
seq(stats::rnorm(20)) # effectively 'along'
seq(1, 9, by = 2)     # matches 'end'
seq(1, 9, by = pi)    # stays below 'end'
seq(1, 6, by = 3)
seq(1.575, 5.125, by = 0.05)
seq(17) # same as 1:17, or even better seq_len(17)



cleanEx()
nameEx("sequence")
### * sequence

flush(stderr()); flush(stdout())

### Name: sequence
### Title: Create A Vector of Sequences
### Aliases: sequence sequence.default
### Keywords: manip

### ** Examples

sequence(c(3, 2)) # the concatenated sequences 1:3 and 1:2.
#> [1] 1 2 3 1 2
sequence(c(3, 2), from=2L)
#> [1] 2 3 4 2 3
sequence(c(3, 2), from=2L, by=2L)
#> [1] 2 4 6 2 4
sequence(c(3, 2), by=c(-1L, 1L))
#> [1] 1 0 -1 1 2



cleanEx()
nameEx("serialize")
### * serialize

flush(stderr()); flush(stdout())

### Name: serialize
### Title: Simple Serialization Interface
### Aliases: serialize unserialize
### Keywords: file connection

### ** Examples

x <- serialize(list(1,2,3), NULL)
unserialize(x)

## see also the examples for saveRDS



cleanEx()
nameEx("sets")
### * sets

flush(stderr()); flush(stdout())

### Name: sets
### Title: Set Operations
### Aliases: union intersect setdiff is.element setequal intersection
### Keywords: misc

### ** Examples

(x <- c(sort(sample(1:20, 9)), NA))
(y <- c(sort(sample(3:23, 7)), NA))
union(x, y)
intersect(x, y)
setdiff(x, y)
setdiff(y, x)
setequal(x, y)

## True for all possible x & y :
setequal( union(x, y),
          c(setdiff(x, y), intersect(x, y), setdiff(y, x)))

is.element(x, y) # length 10
is.element(y, x) # length  8



cleanEx()
nameEx("shQuote")
### * shQuote

flush(stderr()); flush(stdout())

### Name: shQuote
### Title: Quote Strings for Use in OS Shells
### Aliases: shQuote
### Keywords: utilities

### ** Examples

test <- "abc$def`gh`i\\j"
cat(shQuote(test), "\n")
## Not run: system(paste("echo", shQuote(test)))
test <- "don't do it!"
cat(shQuote(test), "\n")

tryit <- paste("use the", sQuote("-c"), "switch\nlike this")
cat(shQuote(tryit), "\n")
## Not run: system(paste("echo", shQuote(tryit)))
cat(shQuote(tryit, type = "csh"), "\n")

## Windows-only example, assuming cmd.exe:
perlcmd <- 'print "Hello World\\n";'
## Not run: 
##D shell(shQuote(paste("perl -e", 
##D                     shQuote(perlcmd, type = "cmd")),
##D               type = "cmd2"))
## End(Not run)



cleanEx()
nameEx("showConnections")
### * showConnections

flush(stderr()); flush(stdout())

### Name: showConnections
### Title: Display Connections
### Aliases: showConnections getConnection getAllConnections
###   closeAllConnections stdin stdout stderr nullfile isatty
### Keywords: connection

### ** Examples

showConnections(all = TRUE)
## Not run: 
##D textConnection(letters)
##D # oops, I forgot to record that one
##D showConnections()
##D #  class     description      mode text   isopen   can read can write
##D #3 "letters" "textConnection" "r"  "text" "opened" "yes"    "no"
##D mycon <- getConnection(3)
## End(Not run)

c(isatty(stdin()), isatty(stdout()), isatty(stderr()))



cleanEx()
nameEx("sign")
### * sign

flush(stderr()); flush(stdout())

### Name: sign
### Title: Sign Function
### Aliases: sign
### Keywords: arith

### ** Examples

sign(pi)    # == 1
sign(-2:3)  # -1 -1 0 1 1 1



cleanEx()
nameEx("sink")
### * sink

flush(stderr()); flush(stdout())

### Name: sink
### Title: Send R Output to a File
### Aliases: sink sink.number
### Keywords: file connection

### ** Examples

sink("sink-examp.txt")
i <- 1:10
outer(i, i)
sink()
## Don't show: 
unlink("sink-examp.txt")
## End(Don't show)


cleanEx()
nameEx("slice.index")
### * slice.index

flush(stderr()); flush(stdout())

### Name: slice.index
### Title: Slice Indexes in an Array
### Aliases: slice.index
### Keywords: array

### ** Examples

x <- array(1 : 24, c(2, 3, 4))
slice.index(x, 2)
slice.index(x, c(1, 3))
## When slicing by dimensions 1 and 3, slice index 5 is obtained for
## dimension 1 has value 1 and dimension 3 has value 3 (see above):
which(slice.index(x, c(1, 3)) == 5, arr.ind = TRUE)



cleanEx()
nameEx("socketSelect")
### * socketSelect

flush(stderr()); flush(stdout())

### Name: socketSelect
### Title: Wait on Socket Connections
### Aliases: socketSelect
### Keywords: connection

### ** Examples

## Not run: 
##D ## test whether socket connection s is available for writing or reading
##D socketSelect(list(s, s), c(TRUE, FALSE), timeout = 0)
## End(Not run)



cleanEx()
nameEx("solve")
### * solve

flush(stderr()); flush(stdout())

### Name: solve
### Title: Solve a System of Equations
### Aliases: solve solve.default
### Keywords: algebra

### ** Examples

hilbert <- function(n) { i <- 1:n; 1 / outer(i - 1, i, `+`) }
h8 <- hilbert(8); h8
sh8 <- solve(h8)
round(sh8 %*% h8, 3)

A <- hilbert(4)
A[] <- as.complex(A)
## might not be supported on all platforms
try(solve(A))



cleanEx()
nameEx("sort")
### * sort

flush(stderr()); flush(stdout())

### Name: sort
### Title: Sorting or Ordering Vectors
### Aliases: sort sort.default sort.POSIXlt sort.int
### Keywords: univar manip arith

### ** Examples

require(stats)

x <- swiss$Education[1:25]
x; sort(x); sort(x, partial = c(10, 15))

## illustrate 'stable' sorting (of ties):
sort(c(10:3, 2:12), method = "shell", index.return = TRUE) # is stable
## $x : 2  3  3  4  4  5  5  6  6  7  7  8  8  9  9 10 10 11 12
## $ix: 9  8 10  7 11  6 12  5 13  4 14  3 15  2 16  1 17 18 19
sort(c(10:3, 2:12), method = "quick", index.return = TRUE) # is not
## $x : 2  3  3  4  4  5  5  6  6  7  7  8  8  9  9 10 10 11 12
## $ix: 9 10  8  7 11  6 12  5 13  4 14  3 15 16  2 17  1 18 19

x <- c(1:3, 3:5, 10)
is.unsorted(x)                  # FALSE: is sorted
is.unsorted(x, strictly = TRUE) # TRUE : is not (and cannot be)
                                # sorted strictly
## Not run: 
##D ## Small speed comparison simulation:
##D N <- 2000
##D Sim <- 20
##D rep <- 1000 # << adjust to your CPU
##D c1 <- c2 <- numeric(Sim)
##D for(is in seq_len(Sim)){
##D   x <- rnorm(N)
##D   c1[is] <- system.time(for(i in 1:rep) sort(x, method = "shell"))[1]
##D   c2[is] <- system.time(for(i in 1:rep) sort(x, method = "quick"))[1]
##D   stopifnot(sort(x, method = "shell") == sort(x, method = "quick"))
##D }
##D rbind(ShellSort = c1, QuickSort = c2)
##D cat("Speedup factor of quick sort():\n")
##D summary({qq <- c1 / c2; qq[is.finite(qq)]})
##D 
##D ## A larger test
##D x <- rnorm(1e7)
##D system.time(x1 <- sort(x, method = "shell"))
##D system.time(x2 <- sort(x, method = "quick"))
##D system.time(x3 <- sort(x, method = "radix"))
##D stopifnot(identical(x1, x2))
##D stopifnot(identical(x1, x3))
## End(Not run)


cleanEx()
nameEx("source")
### * source

flush(stderr()); flush(stdout())

### Name: source
### Title: Read R Code from a File, a Connection or Expressions
### Aliases: source withAutoprint
### Keywords: file programming connection

### ** Examples

someCond <- 7 > 6
## want an if-clause to behave "as top level" wrt auto-printing :
## (all should look "as if on top level", e.g. non-assignments should print:)
if(someCond) withAutoprint({
   x <- 1:12
   x-1
   (y <- (x-5)^2)
   z <- y
   z - 10
})

## If you want to source() a bunch of files, something like
## the following may be useful:
 sourceDir <- function(path, trace = TRUE, ...) {
    op <- options(); on.exit(options(op)) # to reset after each 
    for (nm in list.files(path, pattern = "[.][RrSsQq]$")) {
       if(trace) cat(nm,":")
       source(file.path(path, nm), ...)
       if(trace) cat("\n")
       options(op)
    }
 }

suppressWarnings( rm(x,y) ) # remove 'x' or 'y' from global env
withAutoprint({ x <- 1:2; cat("x=",x,"\n"); y <- x^2 })
## x and y now exist:
stopifnot(identical(x, 1:2), identical(y, x^2))

withAutoprint({ formals(sourceDir); body(sourceDir) },
              max.deparse.length = 20, verbose = TRUE)



cleanEx()
nameEx("split")
### * split

flush(stderr()); flush(stdout())

### Name: split
### Title: Divide into Groups and Reassemble
### Aliases: split split.default split.data.frame split<- split<-.default
###   split<-.data.frame unsplit
### Keywords: category

### ** Examples

require(stats); require(graphics)
n <- 10; nn <- 100
g <- factor(round(n * runif(n * nn)))
x <- rnorm(n * nn) + sqrt(as.numeric(g))
xg <- split(x, g)
boxplot(xg, col = "lavender", notch = TRUE, varwidth = TRUE)
sapply(xg, length)
sapply(xg, mean)

### Calculate 'z-scores' by group (standardize to mean zero, variance one)
z <- unsplit(lapply(split(x, g), scale), g)

# or

zz <- x
split(zz, g) <- lapply(split(x, g), scale)

# and check that the within-group std dev is indeed one
tapply(z, g, sd)
tapply(zz, g, sd)


### data frame variation

## Notice that assignment form is not used since a variable is being added

g <- airquality$Month
l <- split(airquality, g)

## Alternative using a formula
identical(l, split(airquality, ~ Month))

l <- lapply(l, transform, Oz.Z = scale(Ozone))
aq2 <- unsplit(l, g)
head(aq2)
with(aq2, tapply(Oz.Z,  Month, sd, na.rm = TRUE))


### Split a matrix into a list by columns
ma <- cbind(x = 1:10, y = (-4:5)^2)
split(ma, col(ma))

split(1:10, 1:2)



cleanEx()
nameEx("sprintf")
### * sprintf

flush(stderr()); flush(stdout())

### Name: sprintf
### Title: Use C-style String Formatting Commands
### Aliases: sprintf gettextf
### Keywords: print character

### ** Examples

## be careful with the format: most things in R are floats
## only integer-valued reals get coerced to integer.

sprintf("%s is %f feet tall\n", "Sven", 7.1)      # OK
try(sprintf("%s is %i feet tall\n", "Sven", 7.1)) # not OK
    sprintf("%s is %i feet tall\n", "Sven", 7  )  # OK

## use a literal % :

sprintf("%.0f%% said yes (out of a sample of size %.0f)", 66.666, 3)

## various formats of pi :

sprintf("%f", pi)
sprintf("%.3f", pi)
sprintf("%1.0f", pi)
sprintf("%5.1f", pi)
sprintf("%05.1f", pi)
sprintf("%+f", pi)
sprintf("% f", pi)
sprintf("%-10f", pi) # left justified
sprintf("%e", pi)
sprintf("%E", pi)
sprintf("%g", pi)
sprintf("%g",   1e6 * pi) # -> exponential
sprintf("%.9g", 1e6 * pi) # -> "fixed"
sprintf("%G", 1e-6 * pi)

## no truncation:
sprintf("%1.f", 101)

## re-use one argument three times, show difference between %x and %X
xx <- sprintf("%1$d %1$x %1$X", 0:15)
xx <- matrix(xx, dimnames = list(rep("", 16), "%d%x%X"))
noquote(format(xx, justify = "right"))

## More sophisticated:

sprintf("min 10-char string '%10s'",
        c("a", "ABC", "and an even longer one"))


n <- 1:18
sprintf(paste0("e with %2d digits = %.", n, "g"), n, exp(1))

## Using arguments out of order
sprintf("second %2$1.0f, first %1$5.2f, third %3$1.0f", pi, 2, 3)

## Using asterisk for width or precision
sprintf("precision %.*f, width '%*.3f'", 3, pi, 8, pi)

## Asterisk and argument re-use, 'e' example reiterated:
sprintf("e with %1$2d digits = %2$.*1$g", n, exp(1))

## re-cycle arguments
sprintf("%s %d", "test", 1:3)

## binary output showing rounding/representation errors
x <- seq(0, 1.0, 0.1); y <- c(0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1)
cbind(x, sprintf("%a", x), sprintf("%a", y))



cleanEx()
nameEx("srcfile")
### * srcfile

flush(stderr()); flush(stdout())

### Name: srcfile
### Title: References to Source Files and Code
### Aliases: srcfile srcfilecopy getSrcLines srcref srcfile-class
###   srcfilecopy-class srcref-class print.srcfile summary.srcfile
###   open.srcfile open.srcfilecopy close.srcfile print.srcref
###   summary.srcref as.character.srcref .isOpen srcfilealias-class
###   srcfilealias open.srcfilealias close.srcfilealias
### Keywords: debugging utilities

### ** Examples


cleanEx()
nameEx("startsWith")
### * startsWith

flush(stderr()); flush(stdout())

### Encoding: UTF-8

### Name: startsWith
### Title: Does String Start or End With Another String?
### Aliases: endsWith startsWith
### Keywords: character utilities

### ** Examples

startsWith(search(), "package:") # typically at least two FALSE, nowadays often three

x1 <- c("Foobar", "bla bla", "something", "another", "blu", "brown",
        "blau blüht der Enzian")# non-ASCII
x2 <- cbind(
      startsWith(x1, "b"),
      startsWith(x1, "bl"),
      startsWith(x1, "bla"),
        endsWith(x1, "n"),
        endsWith(x1, "an"))
rownames(x2) <- x1; colnames(x2) <- c("b", "b1", "bla", "n", "an")
x2

## Non-equivalence in case of missing values in 'x', see Details:
x <- c("all", "but", NA_character_)
cbind(startsWith(x, "a"),
      substring(x, 1L, 1L) == "a",
      grepl("^a", x))



cleanEx()
nameEx("stop")
### * stop

flush(stderr()); flush(stdout())

### Name: stop
### Title: Stop Function Execution
### Aliases: stop geterrmessage
### Keywords: environment programming error

### ** Examples

iter <- 12
try(if(iter > 10) stop("too many iterations"))

tst1 <- function(...) stop("dummy error")
try(tst1(1:10, long, calling, expression))

tst2 <- function(...) stop("dummy error", call. = FALSE)
try(tst2(1:10, longcalling, expression, but.not.seen.in.Error))



cleanEx()
nameEx("stopifnot")
### * stopifnot

flush(stderr()); flush(stdout())

### Name: stopifnot
### Title: Ensure the Truth of R Expressions
### Aliases: stopifnot
### Keywords: environment programming error

### ** Examples

stopifnot(1 == 1, all.equal(pi, 3.14159265), 1 < 2) # all TRUE

m <- matrix(c(1,3,3,1), 2, 2)
stopifnot(m == t(m), diag(m) == rep(1, 2)) # all(.) |=>  TRUE

op <- options(error = expression(NULL))
# "disabling stop(.)"  << Use with CARE! >>

stopifnot(length(10)) # gives an error: '1' is *not* TRUE
## even when   if(1) "ok"   works

stopifnot(all.equal(pi, 3.141593),  2 < 2, (1:10 < 12), "a" < "b")
## More convenient for interactive "line by line" evaluation:
stopifnot(exprs = {
  all.equal(pi, 3.1415927)
  2 < 2
  1:10 < 12
  "a" < "b"
})

eObj <- expression(2 < 3, 3 <= 3:6, 1:10 < 2)
stopifnot(exprObject = eObj)
stopifnot(exprObject = quote(3 == 3))
stopifnot(exprObject = TRUE)


# long all.equal() error messages are abbreviated:
stopifnot(all.equal(rep(list(pi),4), list(3.1, 3.14, 3.141, 3.1415)))

# The default error message can be overridden to be more informative:
m[1,2] <- 12
stopifnot("m must be symmetric"= m == t(m))
#=> Error: m must be symmetric

options(op)  # revert to previous error handler



cleanEx()
nameEx("strptime")
### * strptime

flush(stderr()); flush(stdout())

### Name: strptime
### Title: Date-time Conversion Functions to and from Character
### Aliases: format.POSIXct format.POSIXlt strftime strptime
###   as.character.POSIXt
### Keywords: utilities chron

### ** Examples


cleanEx()
nameEx("strrep")
### * strrep

flush(stderr()); flush(stdout())

### Name: strrep
### Title: Repeat the Elements of a Character Vector
### Aliases: strrep
### Keywords: character

### ** Examples

strrep("ABC", 2)
strrep(c("A", "B", "C"), 1 : 3)
## Create vectors with the given numbers of spaces:
strrep(" ", 1 : 5)



cleanEx()
nameEx("strsplit")
### * strsplit

flush(stderr()); flush(stdout())

### Name: strsplit
### Title: Split the Elements of a Character Vector
### Aliases: strsplit
### Keywords: character

### ** Examples

noquote(strsplit("A text I want to display with spaces", NULL)[[1]])

x <- c(as = "asfef", qu = "qwerty", "yuiop[", "b", "stuff.blah.yech")
# split x on the letter e
strsplit(x, "e")

unlist(strsplit("a.b.c", "."))
## [1] "" "" "" "" ""
## Note that 'split' is a regexp!
## If you really want to split on '.', use
unlist(strsplit("a.b.c", "[.]"))
## [1] "a" "b" "c"
## or
unlist(strsplit("a.b.c", ".", fixed = TRUE))

## a useful function: rev() for strings
strReverse <- function(x)
        sapply(lapply(strsplit(x, NULL), rev), paste, collapse = "")
strReverse(c("abc", "Statistics"))

## Note that final empty strings are not produced:
strsplit(paste(c("", "a", ""), collapse="#"), split="#")[[1]]
# [1] ""  "a"
## and also an empty string is only produced before a definite match:
strsplit("", " ")[[1]]    # character(0)
strsplit(" ", " ")[[1]]   # [1] ""



cleanEx()
nameEx("strtoi")
### * strtoi

flush(stderr()); flush(stdout())

### Name: strtoi
### Title: Convert Strings to Integers
### Aliases: strtoi
### Keywords: classes character utilities

### ** Examples

strtoi(c("0xff", "077", "123"))
strtoi(c("ffff", "FFFF"), 16L)
strtoi(c("177", "377"), 8L)



cleanEx()
nameEx("strtrim")
### * strtrim

flush(stderr()); flush(stdout())

### Name: strtrim
### Title: Trim Character Strings to Specified Display Widths
### Aliases: strtrim
### Keywords: character utilities

### ** Examples

strtrim(c("abcdef", "abcdef", "abcdef"), c(1,5,10))



cleanEx()
nameEx("structure")
### * structure

flush(stderr()); flush(stdout())

### Name: structure
### Title: Attribute Specification
### Aliases: structure
### Keywords: attribute manip

### ** Examples

structure(1:6, dim = 2:3)

cleanEx()
nameEx("subset")
### * subset

flush(stderr()); flush(stdout())

### Name: subset
### Title: Subsetting Vectors, Matrices and Data Frames
### Aliases: subset subset.default subset.matrix subset.data.frame
### Keywords: manip

### ** Examples

subset(airquality, Temp > 80, select = c(Ozone, Temp))
subset(airquality, Day == 1, select = -Temp)
subset(airquality, select = Ozone:Wind)

with(airquality, subset(Ozone, Temp > 80))

## sometimes requiring a logical 'subset' argument is a nuisance
nm <- rownames(state.x77)
start_with_M <- nm %in% grep("^M", nm, value = TRUE)
subset(state.x77, start_with_M, Illiteracy:Murder)
# but in recent versions of R this can simply be
subset(state.x77, grepl("^M", nm), Illiteracy:Murder)



cleanEx()
nameEx("substitute")
### * substitute

flush(stderr()); flush(stdout())

### Name: substitute
### Title: Substituting and Quoting Expressions
### Aliases: substitute quote enquote
### Keywords: programming data

### ** Examples

require(graphics)
(s.e <- substitute(expression(a + b), list(a = 1)))  #> expression(1 + b)
(s.s <- substitute( a + b,            list(a = 1)))  #> 1 + b
c(mode(s.e), typeof(s.e)) #  "call", "language"
c(mode(s.s), typeof(s.s)) #   (the same)
# but:
(e.s.e <- eval(s.e))          #>  expression(1 + b)
c(mode(e.s.e), typeof(e.s.e)) #  "expression", "expression"

substitute(x <- x + 1, list(x = 1)) # nonsense

myplot <- function(x, y)
    plot(x, y, xlab = deparse1(substitute(x)),
               ylab = deparse1(substitute(y)))

## Simple examples about lazy evaluation, etc:

f1 <- function(x, y = x)             { x <- x + 1; y }
s1 <- function(x, y = substitute(x)) { x <- x + 1; y }
s2 <- function(x, y) { if(missing(y)) y <- substitute(x); x <- x + 1; y }
a <- 10
f1(a)  # 11
s1(a)  # 11
s2(a)  # a
typeof(s2(a))  # "symbol"



cleanEx()
nameEx("substr")
### * substr

flush(stderr()); flush(stdout())

### Name: substr
### Title: Substrings of a Character Vector
### Aliases: substr substring substr<- substring<-
### Keywords: character

### ** Examples

substr("abcdef", 2, 4)
substring("abcdef", 1:6, 1:6)
## strsplit() is more efficient ...

substr(rep("abcdef", 4), 1:4, 4:5)
x <- c("asfef", "qwerty", "yuiop[", "b", "stuff.blah.yech")
substr(x, 2, 5)
substring(x, 2, 4:6)

X <- x
names(X) <- LETTERS[seq_along(x)]
comment(X) <- noquote("is a named vector")
str(aX <- attributes(X))
substring(x, 2) <- c("..", "+++")
substring(X, 2) <- c("..", "+++")
X
stopifnot(x == X, identical(aX, attributes(X)), nzchar(comment(X)))



cleanEx()
nameEx("sum")
### * sum

flush(stderr()); flush(stdout())

### Name: sum
### Title: Sum of Vector Elements
### Aliases: sum
### Keywords: arith

### ** Examples

## Pass a vector to sum, and it will add the elements together.
sum(1:5)

## Pass several numbers to sum, and it also adds the elements.
sum(1, 2, 3, 4, 5)

## In fact, you can pass vectors into several arguments, and everything gets added.
sum(1:2, 3:5)

## If there are missing values, the sum is unknown, i.e., also missing, ....
sum(1:5, NA)
## ... unless  we exclude missing values explicitly:
sum(1:5, NA, na.rm = TRUE)



cleanEx()
nameEx("summary")
### * summary

flush(stderr()); flush(stdout())

### Name: summary
### Title: Object Summaries
### Aliases: summary summary.default summary.data.frame summary.factor
###   summary.matrix format.summaryDefault print.summaryDefault
### Keywords: methods

### ** Examples

summary(attenu, digits = 4) #-> summary.data.frame(...), default precision
summary(attenu $ station, maxsum = 20) #-> summary.factor(...)

lst <- unclass(attenu$station) > 20 # logical with NAs
## summary.default() for logicals -- different from *.factor:
summary(lst)
summary(as.factor(lst))



cleanEx()
nameEx("svd")
### * svd

flush(stderr()); flush(stdout())

### Name: svd
### Title: Singular Value Decomposition of a Matrix
### Aliases: svd La.svd
### Keywords: algebra array

### ** Examples

hilbert <- function(n) { i <- 1:n; 1 / outer(i - 1, i, `+`) }
X <- hilbert(9)[, 1:6]
(s <- svd(X))
D <- diag(s$d)
s$u %*% D %*% t(s$v) #  X = U D V'
t(s$u) %*% X %*% s$v #  D = U' X V



cleanEx()
nameEx("sweep")
### * sweep

flush(stderr()); flush(stdout())

### Name: sweep
### Title: Sweep out Array Summaries
### Aliases: sweep
### Keywords: array iteration

### ** Examples

require(stats) # for median
med.att <- apply(attitude, 2, median)
sweep(data.matrix(attitude), 2, med.att)  # subtract the column medians

## More sweeping:
A <- array(1:24, dim = 4:2)

## no warnings in normal use
sweep(A, 1, 5)
(A.min <- apply(A, 1, min))  # == 1:4
sweep(A, 1, A.min)
sweep(A, 1:2, apply(A, 1:2, median))

## warnings when mismatch
sweep(A, 1, 1:3)  # STATS does not recycle
sweep(A, 1, 6:1)  # STATS is longer

## exact recycling:
sweep(A, 1, 1:2)  # no warning
sweep(A, 1, as.array(1:2))  # warning

## Using named dimnames

dimnames(A) <- list(fee=1:4, fie=1:3, fum=1:2)

mn_fum_fie <- apply(A, c("fum", "fie"), mean)
mn_fum_fie
sweep(A, c("fum", "fie"), mn_fum_fie)



cleanEx()
nameEx("switch")
### * switch

flush(stderr()); flush(stdout())

### Name: switch
### Title: Select One of a List of Alternatives
### Aliases: switch
### Keywords: programming

### ** Examples

require(stats)
centre <- function(x, type) {
  switch(type,
         mean = mean(x),
         median = median(x),
         trimmed = mean(x, trim = .1))
}
x <- rcauchy(10)
centre(x, "mean")
centre(x, "median")
centre(x, "trimmed")

ccc <- c("b","QQ","a","A","bb")
# note: cat() produces no output for NULL
for(ch in ccc)
    cat(ch,":", switch(EXPR = ch, a = 1, b = 2:3), "\n")
for(ch in ccc)
    cat(ch,":", switch(EXPR = ch, a =, A = 1, b = 2:3, "Otherwise: last"),"\n")

## switch(f, *) with a factor f
ff <- gl(3,1, labels=LETTERS[3:1])
ff[1] # C
## so one might expect " is C" here, but
switch(ff[1], A = "I am A", B="Bb..", C=" is C")# -> "I am A"
## so we give a warning

## Numeric EXPR does not allow a default value to be specified
## -- it is always NULL
for(i in c(-1:3, 9))  print(switch(i, 1, 2 , 3, 4))

## visibility
switch(1, invisible(pi), pi)
switch(2, invisible(pi), pi)



cleanEx()
nameEx("sys.parent")
### * sys.parent

flush(stderr()); flush(stdout())

### Name: sys.parent
### Title: Functions to Access the Function Call Stack
### Aliases: sys.parent sys.call sys.calls sys.frame sys.frames sys.nframe
###   sys.function sys.parents sys.on.exit sys.status parent.frame
### Keywords: programming data

### ** Examples


cleanEx()
nameEx("sys.source")
### * sys.source

flush(stderr()); flush(stdout())

### Name: sys.source
### Title: Parse and Evaluate Expressions from a File
### Aliases: sys.source
### Keywords: file utilities

### ** Examples

## a simple way to put some objects in an environment
## high on the search path
tmp <- tempfile()
writeLines("aaa <- pi", tmp)
env <- attach(NULL, name = "myenv")
sys.source(tmp, env)
unlink(tmp)
search()
aaa
detach("myenv")



cleanEx()
nameEx("system")
### * system

flush(stderr()); flush(stdout())

### Name: system
### Title: Invoke a System Command
### Aliases: system shell
### Keywords: interface file utilities

### ** Examples

# list all files in the current directory using the -F flag
## Not run: system("ls -F")

# t1 is a character vector, each element giving a line of output from who
# (if the platform has who)
t1 <- try(system("who", intern = TRUE))

try(system("ls fizzlipuzzli", intern = TRUE, ignore.stderr = TRUE))
# zero-length result since file does not exist, and will give warning.



cleanEx()
nameEx("system.file")
### * system.file

flush(stderr()); flush(stdout())

### Name: system.file
### Title: Find Names of R System Files
### Aliases: system.file
### Keywords: file utilities

### ** Examples

system.file()                  # The root of the 'base' package
system.file(package = "stats") # The root of package 'stats'
system.file("INDEX")
system.file("help", "AnIndex", package = "splines")



cleanEx()
nameEx("system.time")
### * system.time

flush(stderr()); flush(stdout())

### Name: system.time
### Title: CPU Time Used
### Aliases: system.time
### Keywords: utilities

### ** Examples

require(stats)
## Not run: 
##D exT <- function(n = 10000) {
##D   # Purpose: Test if system.time works ok;   n: loop size
##D   system.time(for(i in 1:n) x <- mean(rt(1000, df = 4)))
##D }
##D #-- Try to interrupt one of the following (using Ctrl-C / Escape):
##D exT()                 #- about 4 secs on a 2.5GHz Xeon
##D system.time(exT())    #~ +/- same
## End(Not run)


cleanEx()
nameEx("t")
### * t

flush(stderr()); flush(stdout())

### Name: t
### Title: Matrix Transpose
### Aliases: t t.default t.data.frame
### Keywords: array

### ** Examples

a <- matrix(1:30, 5, 6)
ta <- t(a) ##-- i.e.,  a[i, j] == ta[j, i] for all i,j :
for(j in seq(ncol(a)))
  if(! all(a[, j] == ta[j, ])) stop("wrong transpose")



cleanEx()
nameEx("table")
### * table

flush(stderr()); flush(stdout())

### Name: table
### Title: Cross Tabulation and Table Creation
### Aliases: table summary.table print.summary.table as.data.frame.table
###   as.table as.table.default is.table [.table
### Keywords: category

### ** Examples

require(stats) # for rpois and xtabs
## Simple frequency distribution
table(rpois(100, 5))
## Check the design:
with(warpbreaks, table(wool, tension))
table(state.division, state.region)

# simple two-way contingency table
with(airquality, table(cut(Temp, quantile(Temp)), Month))

a <- letters[1:3]
table(a, sample(a))                    # dnn is c("a", "")
table(a, sample(a), deparse.level = 0) # dnn is c("", "")
table(a, sample(a), deparse.level = 2) # dnn is c("a", "sample(a)")

## xtabs() <-> as.data.frame.table() :
UCBAdmissions ## already a contingency table
DF <- as.data.frame(UCBAdmissions)
class(tab <- xtabs(Freq ~ ., DF)) # xtabs & table
## tab *is* "the same" as the original table:
all(tab == UCBAdmissions)
all.equal(dimnames(tab), dimnames(UCBAdmissions))

a <- rep(c(NA, 1/0:3), 10)
table(a)                 # does not report NA's
table(a, exclude = NULL) # reports NA's
b <- factor(rep(c("A","B","C"), 10))
table(b)
table(b, exclude = "B")
d <- factor(rep(c("A","B","C"), 10), levels = c("A","B","C","D","E"))
table(d, exclude = "B")
print(table(b, d), zero.print = ".")

## NA counting:
is.na(d) <- 3:4
d. <- addNA(d)
d.[1:7]
table(d.) # ", exclude = NULL" is not needed
## i.e., if you want to count the NA's of 'd', use
table(d, useNA = "ifany")

## "pathological" case:
d.patho <- addNA(c(1,NA,1:2,1:3))[-7]; is.na(d.patho) <- 3:4
d.patho
## just 3 consecutive NA's ? --- well, have *two* kinds of NAs here :
as.integer(d.patho) # 1 4 NA NA 1 2
##
## In R >= 3.4.0, table() allows to differentiate:
table(d.patho)                   # counts the "unusual" NA
table(d.patho, useNA = "ifany")  # counts all three
table(d.patho, exclude = NULL)   #  (ditto)
table(d.patho, exclude = NA)     # counts none

## Two-way tables with NA counts. The 3rd variant is absurd, but shows
## something that cannot be done using exclude or useNA.
with(airquality,
   table(OzHi = Ozone > 80, Month, useNA = "ifany"))
with(airquality,
   table(OzHi = Ozone > 80, Month, useNA = "always"))
with(airquality,
   table(OzHi = Ozone > 80, addNA(Month)))



cleanEx()
nameEx("tabulate")
### * tabulate

flush(stderr()); flush(stdout())

### Name: tabulate
### Title: Tabulation for Vectors
### Aliases: tabulate
### Keywords: arith

### ** Examples

tabulate(c(2,3,5))
tabulate(c(2,3,3,5), nbins = 10)
tabulate(c(-2,0,2,3,3,5))  # -2 and 0 are ignored
tabulate(c(-2,0,2,3,3,5), nbins = 3)
tabulate(factor(letters[1:10]))



cleanEx()
nameEx("tapply")
### * tapply

flush(stderr()); flush(stdout())

### Name: tapply
### Title: Apply a Function Over a Ragged Array
### Aliases: tapply
### Keywords: iteration category

### ** Examples

require(stats)
groups <- as.factor(rbinom(32, n = 5, prob = 0.4))
tapply(groups, groups, length) #- is almost the same as
table(groups)

## contingency table from data.frame : array with named dimnames
tapply(warpbreaks$breaks, warpbreaks[,-1], sum)
tapply(warpbreaks$breaks, warpbreaks[, 3, drop = FALSE], sum)

n <- 17; fac <- factor(rep_len(1:3, n), levels = 1:5)
table(fac)
tapply(1:n, fac, sum)
tapply(1:n, fac, sum, default = 0) # maybe more desirable
tapply(1:n, fac, sum, simplify = FALSE)
tapply(1:n, fac, range)
tapply(1:n, fac, quantile)
tapply(1:n, fac, length) ## NA's
tapply(1:n, fac, length, default = 0) # == table(fac)
## Don't show: 
stopifnot(all.equal(
  unname(unclass(table(fac))),
  unname(        tapply(1:n, fac, length, default = 0))))
## End(Don't show)
## example of ... argument: find quarterly means
tapply(presidents, cycle(presidents), mean, na.rm = TRUE)

ind <- list(c(1, 2, 2), c("A", "A", "B"))
table(ind)
tapply(1:3, ind) #-> the split vector
tapply(1:3, ind, sum)

## Some assertions (not held by all patch propsals):
nq <- names(quantile(1:5))
stopifnot(
  identical(tapply(1:3, ind), c(1L, 2L, 4L)),
  identical(tapply(1:3, ind, sum),
            matrix(c(1L, 2L, NA, 3L), 2, dimnames = list(c("1", "2"), c("A", "B")))),
  identical(tapply(1:n, fac, quantile)[-1],
            array(list(`2` = structure(c(2, 5.75, 9.5, 13.25, 17), names = nq),
                 `3` = structure(c(3, 6, 9, 12, 15), names = nq),
                 `4` = NULL, `5` = NULL), dim=4, dimnames=list(as.character(2:5)))))



cleanEx()
nameEx("taskCallback")
### * taskCallback

flush(stderr()); flush(stdout())

### Name: taskCallback
### Title: Add or Remove a Top-Level Task Callback
### Aliases: addTaskCallback removeTaskCallback
### Keywords: environment

### ** Examples

times <- function(total = 3, str = "Task a") {
  ctr <- 0
  function(expr, value, ok, visible) {
    ctr <<- ctr + 1
    cat(str, ctr, "\n")
    keep.me <- (ctr < total)
    if (!keep.me)
      cat("handler removing itself\n")

    # return
    keep.me
  }
}

# add the callback that will work for
# 4 top-level tasks and then remove itself.
n <- addTaskCallback(times(4))

# now remove it, assuming it is still first in the list.
removeTaskCallback(n)

## See how the handler is called every time till "self destruction":

addTaskCallback(times(4)) # counts as once already

sum(1:10) ; mean(1:3) # two more
sinpi(1)              # 4th - and "done"
cospi(1)
tanpi(1)



cleanEx()
nameEx("taskCallbackManager")
### * taskCallbackManager

flush(stderr()); flush(stdout())

### Name: taskCallbackManager
### Title: Create an R-level Task Callback Manager
### Aliases: taskCallbackManager
### Keywords: environment

### ** Examples

# create the manager
h <- taskCallbackManager()

# add a callback
h$add(function(expr, value, ok, visible) {
                       cat("In handler\n")
                       return(TRUE)
                     }, name = "simpleHandler")

# look at the internal callbacks.
getTaskCallbackNames()

# look at the R-level callbacks
names(h$callbacks())

removeTaskCallback("R-taskCallbackManager")



cleanEx()
nameEx("taskCallbackNames")
### * taskCallbackNames

flush(stderr()); flush(stdout())

### Name: taskCallbackNames
### Title: Query the Names of the Current Internal Top-Level Task Callbacks
### Aliases: getTaskCallbackNames
### Keywords: environment

### ** Examples

 n <- addTaskCallback(function(expr, value, ok, visible) {
                        cat("In handler\n")
                        return(TRUE)
                      }, name = "simpleHandler")

 getTaskCallbackNames()

   # now remove it by name
 removeTaskCallback("simpleHandler")


 h <- taskCallbackManager()
 h$add(function(expr, value, ok, visible) {
                        cat("In handler\n")
                        return(TRUE)
                      }, name = "simpleHandler")
 getTaskCallbackNames()
 removeTaskCallback("R-taskCallbackManager")



cleanEx()
nameEx("tempfile")
### * tempfile

flush(stderr()); flush(stdout())

### Name: tempfile
### Title: Create Names for Temporary Files
### Aliases: tempfile tempdir
### Keywords: file

### ** Examples

## Show how 'check' is working on some platforms:
if(exists("I'm brave") && `I'm brave` &&
   identical(.Platform$OS.type, "unix") && grepl("^/tmp/", tempdir())) {
  cat("Current tempdir(): ", tempdir(), "\n")
  cat("Removing it :", file.remove(tempdir()),
      "; dir.exists(tempdir()):", dir.exists(tempdir()), "\n")
  cat("and now  tempdir(check = TRUE) :", tempdir(check = TRUE),"\n")
}




cleanEx()
nameEx("textconnections")
### * textconnections

flush(stderr()); flush(stdout())

### Name: textConnection
### Title: Text Connections
### Aliases: textConnection textConnectionValue
### Keywords: file connection

### ** Examples

zz <- textConnection(LETTERS)
readLines(zz, 2)
scan(zz, "", 4)
pushBack(c("aa", "bb"), zz)
scan(zz, "", 4)
close(zz)

zz <- textConnection("foo", "w")
writeLines(c("testit1", "testit2"), zz)
cat("testit3 ", file = zz)
isIncomplete(zz)
cat("testit4\n", file = zz)
isIncomplete(zz)
close(zz)
foo




cleanEx()
nameEx("timezones")
### * timezones

flush(stderr()); flush(stdout())

### Name: timezones
### Title: Time Zones
### Aliases: Sys.timezone OlsonNames timezone timezones 'time zone' 'time
###   zones' TZ TZDIR .sys.timezone
### Keywords: utilities chron

### ** Examples

Sys.timezone()

str(OlsonNames()) ## typically close to six hundred names,
## typically some acronyms/aliases such as "UTC", "NZ", "MET", "Eire", ..., but
## mostly pairs (and triplets) such as "Pacific/Auckland"
table(sl <- grepl("/", OlsonNames()))
OlsonNames()[ !sl ] # the simple ones
head(Osl <- strsplit(OlsonNames()[sl], "/"))
(tOS1 <- table(vapply(Osl, `[[`, "", 1))) # Continents, countries, ...
table(lengths(Osl))# most are pairs, some triplets
str(Osl[lengths(Osl) >= 3])# "America" South and North ...



cleanEx()
nameEx("toString")
### * toString

flush(stderr()); flush(stdout())

### Name: toString
### Title: Convert an R Object to a Character String
### Aliases: toString toString.default
### Keywords: utilities

### ** Examples

x <- c("a", "b", "aaaaaaaaaaa")
toString(x)
toString(x, width = 8)



cleanEx()
nameEx("trace")
### * trace

flush(stderr()); flush(stdout())

### Name: trace
### Title: Interactive Tracing and Debugging of Calls to a Function or
###   Method
### Aliases: trace untrace tracingState .doTrace returnValue
### Keywords: programming debugging

### ** Examples

require(stats)

##  Very simple use
trace(sum)
hist(rnorm(100)) # shows about 3-4 calls to sum()
untrace(sum)

## Show how pt() is called from inside power.t.test():
if(FALSE)
  trace(pt) ## would show ~20 calls, but we want to see more:
trace(pt, tracer = quote(cat(sprintf("tracing pt(*, ncp = %.15g)\n", ncp))),
      print = FALSE) # <- not showing typical extra
power.t.test(20, 1, power=0.8, sd=NULL)  ##--> showing the ncp root finding:
untrace(pt)

f <- function(x, y) {
    y <- pmax(y, 0.001)
    if (x > 0) x ^ y else stop("x must be positive")
}

## arrange to call the browser on entering and exiting
## function f
trace("f", quote(browser(skipCalls = 4)),
      exit = quote(browser(skipCalls = 4)))

## instead, conditionally assign some data, and then browse
## on exit, but only then.  Don't bother me otherwise

trace("f", quote(if(any(y < 0)) yOrig <- y),
      exit = quote(if(exists("yOrig")) browser(skipCalls = 4)),
      print = FALSE)

## Enter the browser just before stop() is called.  First, find
## the step numbers

untrace(f) # (as it has changed f's body !)
as.list(body(f))
as.list(body(f)[[3]]) # -> stop(..) is [[4]]

## Now call the browser there

trace("f", quote(browser(skipCalls = 4)), at = list(c(3,4)))
## Not run: 
##D f(-1,2) # --> enters browser just before stop(..)
## End(Not run)

## trace a utility function, with recover so we
## can browse in the calling functions as well.

trace("as.matrix", recover)

## turn off the tracing (that happened above)

untrace(c("f", "as.matrix"))

## Not run: 
##D ## Useful to find how system2() is called in a higher-up function:
##D trace(base::system2, quote(print(ls.str())))
## End(Not run)

##-------- Tracing hidden functions : need 'where = *'
##
## 'where' can be a function whose environment is meant:
trace(quote(ar.yw.default), where = ar)
a <- ar(rnorm(100)) # "Tracing ..."
untrace(quote(ar.yw.default), where = ar)

## trace() more than one function simultaneously:
##         expression(E1, E2, ...)  here is equivalent to
##          c(quote(E1), quote(E2), quote(.*), ..)
trace(expression(ar.yw, ar.yw.default), where = ar)
a <- ar(rnorm(100)) # --> 2 x "Tracing ..."
# and turn it off:
untrace(expression(ar.yw, ar.yw.default), where = ar)


## Not run: 
##D ## trace calls to the function lm() that come from
##D ## the nlme package.
##D ## (The function nlme is in that package, and the package
##D ## has a namespace, so the where= argument must be used
##D ## to get the right version of lm)
##D 
##D trace(lm, exit = recover, where = asNamespace("nlme"))
## End(Not run)



cleanEx()
nameEx("traceback")
### * traceback

flush(stderr()); flush(stdout())

### Name: traceback
### Title: Get and Print Call Stacks
### Aliases: traceback .traceback .Traceback
### Keywords: programming

### ** Examples

foo <- function(x) { print(1); bar(2) }
bar <- function(x) { x + a.variable.which.does.not.exist }
## Not run: 
##D foo(2) # gives a strange error
##D traceback()
## End(Not run)
## 2: bar(2)
## 1: foo(2)
bar
## Ah, this is the culprit ...

## This will print the stack trace at the time of the error.
options(error = function() traceback(3))



cleanEx()
nameEx("tracemem")
### * tracemem

flush(stderr()); flush(stdout())

### Name: tracemem
### Title: Trace Copying of Objects
### Aliases: tracemem untracemem retracemem
### Keywords: utilities

### ** Examples
## Not run: 
##D a <- 1:10
##D tracemem(a)
##D ## b and a share memory
##D b <- a
##D b[1] <- 1
##D untracemem(a)
##D 
##D ## copying in lm: less than R <= 2.15.0
##D d <- stats::rnorm(10)
##D tracemem(d)
##D lm(d ~ a+log(b))
##D 
##D ## f is not a copy and is not traced
##D f <- d[-1]
##D f+1
##D ## indicate that f should be traced as a copy of d
##D retracemem(f, retracemem(d))
##D f+1
## End(Not run)


cleanEx()
nameEx("transform")
### * transform

flush(stderr()); flush(stdout())

### Name: transform
### Title: Transform an Object, for Example a Data Frame
### Aliases: transform transform.default transform.data.frame
### Keywords: manip

### ** Examples

transform(airquality, Ozone = -Ozone)
transform(airquality, new = -Ozone, Temp = (Temp-32)/1.8)

attach(airquality)
transform(Ozone, logOzone = log(Ozone)) # marginally interesting ...
detach(airquality)



cleanEx()
nameEx("trimws")
### * trimws

flush(stderr()); flush(stdout())

### Name: trimws
### Title: Remove Leading/Trailing Whitespace
### Aliases: trimws
### Keywords: character

### ** Examples

x <- "  Some text. "
x
trimws(x)
trimws(x, "l")
trimws(x, "r")

## Unicode --> need "stronger" 'whitespace' to match all :
tt <- "text with unicode 'non breakable space'."
xu <- paste(" \t\v", tt, "\u00a0 \n\r")
(tu <- trimws(xu, whitespace = "[\\h\\v]"))
stopifnot(identical(tu, tt))



cleanEx()
nameEx("try")
### * try

flush(stderr()); flush(stdout())

### Name: try
### Title: Try an Expression Allowing Error Recovery
### Aliases: try
### Keywords: programming

### ** Examples

## this example will not work correctly in example(try), but
## it does work correctly if pasted in
options(show.error.messages = FALSE)
try(log("a"))
print(.Last.value)
options(show.error.messages = TRUE)

## alternatively,
print(try(log("a"), TRUE))

## run a simulation, keep only the results that worked.
set.seed(123)
x <- stats::rnorm(50)
doit <- function(x)
{
    x <- sample(x, replace = TRUE)
    if(length(unique(x)) > 30) mean(x)
    else stop("too few unique points")
}
## alternative 1
res <- lapply(1:100, function(i) try(doit(x), TRUE))
## alternative 2
## Not run: 
##D res <- vector("list", 100)
##D for(i in 1:100) res[[i]] <- try(doit(x), TRUE)
## End(Not run)
unlist(res[sapply(res, function(x) !inherits(x, "try-error"))])



cleanEx()
nameEx("typeof")
### * typeof

flush(stderr()); flush(stdout())

### Name: typeof
### Title: The Type of an Object
### Aliases: typeof type
### Keywords: attribute

### ** Examples

typeof(2)
mode(2)
## for a table of examples, see  ?mode  /  examples(mode)



cleanEx()
nameEx("unique")
### * unique

flush(stderr()); flush(stdout())

### Name: unique
### Title: Extract Unique Elements
### Aliases: unique unique.default unique.data.frame unique.matrix
###   unique.array
### Keywords: manip logic

### ** Examples

x <- c(3:5, 11:8, 8 + 0:5)
(ux <- unique(x))
(u2 <- unique(x, fromLast = TRUE)) # different order
stopifnot(identical(sort(ux), sort(u2)))

length(unique(sample(100, 100, replace = TRUE)))
## approximately 100(1 - 1/e) = 63.21

unique(iris)



cleanEx()
nameEx("unlist")
### * unlist

flush(stderr()); flush(stdout())

### Name: unlist
### Title: Flatten Lists
### Aliases: unlist
### Keywords: list manip

### ** Examples

unlist(options())
unlist(options(), use.names = FALSE)

l.ex <- list(a = list(1:5, LETTERS[1:5]), b = "Z", c = NA)
unlist(l.ex, recursive = FALSE)
unlist(l.ex, recursive = TRUE)

l1 <- list(a = "a", b = 2, c = pi+2i)
unlist(l1) # a character vector
l2 <- list(a = "a", b = as.name("b"), c = pi+2i)
unlist(l2) # remains a list

ll <- list(as.name("sinc"), quote( a + b ), 1:10, letters, expression(1+x))
utils::str(ll)
for(x in ll)
  stopifnot(identical(x, unlist(x)))



cleanEx()
nameEx("unname")
### * unname

flush(stderr()); flush(stdout())

### Name: unname
### Title: Remove 'names' or 'dimnames'
### Aliases: unname
### Keywords: utilities

### ** Examples

require(graphics); require(stats)

## Answering a question on R-help (14 Oct 1999):
col3 <- 750+ 100*rt(1500, df = 3)
breaks <- factor(cut(col3, breaks = 360+5*(0:155)))
z <- table(breaks)
z[1:5] # The names are larger than the data ...
barplot(unname(z), axes = FALSE)



cleanEx()
nameEx("userhooks")
### * userhooks

flush(stderr()); flush(stdout())

### Name: userhooks
### Title: Functions to Get and Set Hooks for Load, Attach, Detach and
###   Unload
### Aliases: getHook setHook packageEvent .userHooksEnv
### Keywords: utilities

### ** Examples

setHook(packageEvent("grDevices", "onLoad"),
        function(...) grDevices::ps.options(horizontal = FALSE))



cleanEx()
nameEx("utf8Conversion")
### * utf8Conversion

flush(stderr()); flush(stdout())

### Name: utf8Conversion
### Title: Convert Integer Vectors to or from UTF-8-encoded Character
###   Vectors
### Aliases: utf8ToInt intToUtf8 Unicode 'code point'
### Keywords: character utilities

### ** Examples
utf8ToInt("bi\u00dfchen")
utf8ToInt("\xfa\xb4\xbf\xbf\x9f")

## A valid UTF-16 surrogate pair (for U+10437)
x <- c(0xD801, 0xDC37)
intToUtf8(x)
intToUtf8(x, TRUE)
(xx <- intToUtf8(x, , TRUE)) # will only display in some locales and fonts
charToRaw(xx)




cleanEx()
nameEx("validUTF8")
### * validUTF8

flush(stderr()); flush(stdout())

### Name: validUTF8
### Title: Check if a Character Vector is Validly Encoded
### Aliases: validUTF8 validEnc

### ** Examples

x <-
  ## from example(text)
c("Jetz", "no", "chli", "z\xc3\xbcrit\xc3\xbc\xc3\xbctsch:",
  "(noch", "ein", "bi\xc3\x9fchen", "Z\xc3\xbc", "deutsch)",
   ## from a CRAN check log
   "\xfa\xb4\xbf\xbf\x9f")
validUTF8(x)
validEnc(x) # depends on the locale
Encoding(x) <-"UTF-8"
validEnc(x) # typically the last, x[10], is invalid

## Maybe advantageous to declare it "unknown":
G <- x ; Encoding(G[!validEnc(G)]) <- "unknown"
try( substr(x, 1,1) ) # gives 'invalid multibyte string' error in a UTF-8 locale
try( substr(G, 1,1) ) # works in a UTF-8 locale
nchar(G) # fine, too
## but it is not "more valid" typically:
all.equal(validEnc(x),
          validEnc(G)) # typically TRUE



cleanEx()
nameEx("vector")
### * vector

flush(stderr()); flush(stdout())

### Name: vector
### Title: Vectors - Creation, Coercion, etc
### Aliases: vector as.vector as.vector.data.frame as.vector.factor
###   as.vector.POSIXlt is.vector atomic
### Keywords: classes

### ** Examples

df <- data.frame(x = 1:3, y = 5:7)
## Error:
try(as.vector(data.frame(x = 1:3, y = 5:7), mode = "numeric"))

x <- c(a = 1, b = 2)
is.vector(x)
as.vector(x)
all.equal(x, as.vector(x)) ## FALSE


###-- All the following are TRUE:
is.list(df)
! is.vector(df)
! is.vector(df, mode = "list")

is.vector(list(), mode = "list")



cleanEx()
nameEx("warning")
### * warning

flush(stderr()); flush(stdout())

### Name: warning
### Title: Warning Messages
### Aliases: warning suppressWarnings
### Keywords: programming error

### ** Examples

## Don't show: 
oldopt <- options(warn = 1)
## End(Don't show)
testit <- function() warning("testit")
testit() ## shows call
testit <- function() warning("problem in testit", call. = FALSE)
testit() ## no call
suppressWarnings(warning("testit"))
## Don't show: 
eigenval <- 10 ^ -stats::rnorm(1, mean = 6)
if(eigenval < 1.e-7) warning("system near singular")
options(oldopt)
## End(Don't show)



cleanEx()
nameEx("warnings")
### * warnings

flush(stderr()); flush(stdout())

### Name: warnings
### Title: Print Warning Messages
### Aliases: warnings last.warning print.warnings [.warnings c.warnings
###   duplicated.warnings unique.warnings summary.warnings
###   print.summary.warnings
### Keywords: programming error

### ** Examples

## NB this example is intended to be pasted in,
##    rather than run by example()
ow <- options("warn")
for(w in -1:1) {
   options(warn = w); cat("\n warn =", w, "\n")
   for(i in 1:3) { cat(i,"..\n"); m <- matrix(1:7, 3,4) }
   cat("--=--=--\n")
}
## at the end prints all three warnings, from the 'option(warn = 0)' above
options(ow) # reset to previous, typically 'warn = 0'
tail(warnings(), 2) # see the last two warnings only (via '[' method)

## Often the most useful way to look at many warnings:
summary(warnings())
## Don't show: 
ww <- warnings()
uw <- unique(ww)
sw <- summary(ww)
stopifnot(identical(c(ww[1], ww[3]), ww[c(1, 3)]),
          length(uw) == 1, nchar(names(uw)) > 10,
          length(sw) == 1, attr(sw, "counts") == 3)
## End(Don't show)
op <- options(nwarnings = 10000) ## <- get "full statistics"
x <- 1:36; for(n in 1:13) for(m in 1:12) A <- matrix(x, n,m) # There were 105 warnings ...
summary(warnings())
options(op) # revert to previous (keeping 50 messages by default)



cleanEx()
nameEx("weekday.POSIXt")
### * weekday.POSIXt

flush(stderr()); flush(stdout())

### Name: weekdays
### Title: Extract Parts of a POSIXt or Date Object
### Aliases: weekdays weekdays.POSIXt weekdays.Date months months.POSIXt
###   months.Date quarters quarters.POSIXt quarters.Date julian
###   julian.POSIXt julian.Date
### Keywords: chron

### ** Examples


cleanEx()
nameEx("which")
### * which

flush(stderr()); flush(stdout())

### Name: which
### Title: Which indices are TRUE?
### Aliases: which arrayInd
### Keywords: logic attribute

### ** Examples

which(LETTERS == "R")
which(ll <- c(TRUE, FALSE, TRUE, NA, FALSE, FALSE, TRUE)) #> 1 3 7
names(ll) <- letters[seq(ll)]
which(ll)
which((1:12)%%2 == 0) # which are even?
which(1:10 > 3, arr.ind = TRUE)

( m <- matrix(1:12, 3, 4) )
div.3 <- m %% 3 == 0
which(div.3)
which(div.3, arr.ind = TRUE)
rownames(m) <- paste("Case", 1:3, sep = "_")
which(m %% 5 == 0, arr.ind = TRUE)

dim(m) <- c(2, 2, 3); m
which(div.3, arr.ind = FALSE)
which(div.3, arr.ind = TRUE)

vm <- c(m)
dim(vm) <- length(vm) #-- funny thing with  length(dim(...)) == 1
which(div.3, arr.ind = TRUE)
## Don't show: 
dimnames(m) <- list(X = c("U", "V"), Z = c("y","z"), three = LETTERS[1:3])
wm <- which(m %% 3 == 0, arr.ind = TRUE)
vn <- vm; dimnames(vn) <- list(LETTERS[1:12])
wv <- which(vn %% 3 == 0, arr.ind = TRUE)

stopifnot(identical(wv, array(3L*(1:4), dim = c(4, 1),
                              dimnames = list(c("C", "F", "I", "L"), "dim1"))),
          identical(wm, array(c(1:2, 1:2, 2:1, 1:2, 1:3, 3L),
                              dim = 4:3,
                              dimnames = list(rep(c("U","V"),2),
                                              c("X", "Z", "three"))))
)
## End(Don't show)



cleanEx()
nameEx("which.min")
### * which.min

flush(stderr()); flush(stdout())

### Name: which.min
### Title: Where is the Min() or Max() or first TRUE or FALSE ?
### Aliases: which.min which.max
### Keywords: utilities

### ** Examples

x <- c(1:4, 0:5, 11)
which.min(x)
which.max(x)

## it *does* work with NA's present, by discarding them:
presidents[1:30]
range(presidents, na.rm = TRUE)
which.min(presidents) # 28
which.max(presidents) #  2

## Find the first occurrence, i.e. the first TRUE, if there is at least one:
x <- rpois(10000, lambda = 10); x[sample.int(50, 20)] <- NA
## where is the first value >= 20 ?
which.max(x >= 20)

## Also works for lists (which can be coerced to numeric vectors):
which.min(list(A = 7, pi = pi)) ##  ->  c(pi = 2L)
## Don't show: 
stopifnot(identical(which.min(list(A = 7, pi = pi)), c(pi = 2L)))
## End(Don't show)



cleanEx()
nameEx("with")
### * with

flush(stderr()); flush(stdout())

### Name: with
### Title: Evaluate an Expression in a Data Environment
### Aliases: with with.default within within.list within.data.frame
### Keywords: data programming

### ** Examples

with(mtcars, mpg[cyl == 8  &  disp > 350])
    # is the same as, but nicer than
mtcars$mpg[mtcars$cyl == 8  &  mtcars$disp > 350]

require(stats); require(graphics)

# examples from glm:
with(data.frame(u = c(5,10,15,20,30,40,60,80,100),
                lot1 = c(118,58,42,35,27,25,21,19,18),
                lot2 = c(69,35,26,21,18,16,13,12,12)),
    list(summary(glm(lot1 ~ log(u), family = Gamma)),
         summary(glm(lot2 ~ log(u), family = Gamma))))

aq <- within(airquality, {     # Notice that multiple vars can be changed
    lOzone <- log(Ozone)
    Month <- factor(month.abb[Month])
    cTemp <- round((Temp - 32) * 5/9, 1) # From Fahrenheit to Celsius
    S.cT <- Solar.R / cTemp  # using the newly created variable
    rm(Day, Temp)
})
head(aq)




# example from boxplot:
with(ToothGrowth, {
    boxplot(len ~ dose, boxwex = 0.25, at = 1:3 - 0.2,
            subset = (supp == "VC"), col = "yellow",
            main = "Guinea Pigs' Tooth Growth",
            xlab = "Vitamin C dose mg",
            ylab = "tooth length", ylim = c(0, 35))
    boxplot(len ~ dose, add = TRUE, boxwex = 0.25, at = 1:3 + 0.2,
            subset = supp == "OJ", col = "orange")
    legend(2, 9, c("Ascorbic acid", "Orange juice"),
           fill = c("yellow", "orange"))
})

# alternate form that avoids subset argument:
with(subset(ToothGrowth, supp == "VC"),
     boxplot(len ~ dose, boxwex = 0.25, at = 1:3 - 0.2,
             col = "yellow", main = "Guinea Pigs' Tooth Growth",
             xlab = "Vitamin C dose mg",
             ylab = "tooth length", ylim = c(0, 35)))
with(subset(ToothGrowth,  supp == "OJ"),
     boxplot(len ~ dose, add = TRUE, boxwex = 0.25, at = 1:3 + 0.2,
             col = "orange"))
legend(2, 9, c("Ascorbic acid", "Orange juice"),
       fill = c("yellow", "orange"))



cleanEx()
nameEx("withVisible")
### * withVisible

flush(stderr()); flush(stdout())

### Name: withVisible
### Title: Return both a Value and its Visibility
### Aliases: withVisible
### Keywords: programming

### ** Examples

x <- 1
withVisible(x <- 1) # *$visible is FALSE
x
withVisible(x)      # *$visible is TRUE

# Wrap the call in evalq() for special handling

df <- data.frame(a = 1:5, b = 1:5)
evalq(withVisible(a + b), envir = df)



cleanEx()
nameEx("write")
### * write

flush(stderr()); flush(stdout())

### Name: write
### Title: Write Data to a File
### Aliases: write
### Keywords: file connection

### ** Examples

# create a 2 by 5 matrix
x <- matrix(1:10, ncol = 5)

fil <- tempfile("data")
# the file data contains x, two rows, five cols
# 1 3 5 7 9 will form the first row
write(t(x), fil)
if(interactive()) file.show(fil)
unlink(fil) # tidy up

# Writing to the "console" 'tab-delimited'
# two rows, five cols but the first row is 1 2 3 4 5
write(x, "", sep = "\t")


cleanEx()
nameEx("zpackages")
### * zpackages

flush(stderr()); flush(stdout())

### Name: zpackages
### Title: Listing of Packages
### Aliases: .packages
### Keywords: data

### ** Examples

(.packages())               # maybe just "base"
.packages(all.available = TRUE) # return all available as character vector
require(splines)
(.packages())               # "splines", too
detach("package:splines")
