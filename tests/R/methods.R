pkgname <- "methods"
source(file.path(R.home("share"), "R", "examples-header.R"))
options(warn = 1)
library('methods')

base::assign(".oldSearch", base::search(), pos = 'CheckExEnv')
base::assign(".old_wd", base::getwd(), pos = 'CheckExEnv')
cleanEx()
nameEx("GenericFunctions")
### * GenericFunctions

flush(stderr()); flush(stdout())

### Name: GenericFunctions
### Title: Tools for Managing Generic Functions
### Aliases: GenericFunctions isGeneric isGroup removeGeneric getGenerics
###   dumpMethod findFunction dumpMethods removeMethods signature
###   setReplaceMethod
### Keywords: programming classes methods

### ** Examples

require(stats) # for lm

## get the function "myFun" -- throw an error if 0 or > 1 versions visible:
findFuncStrict <- function(fName) {
  allF <- findFunction(fName)
  if(length(allF) == 0)
    stop("No versions of ",fName," visible")
  else if(length(allF) > 1)
    stop(fName," is ambiguous: ", length(allF), " versions")
  else
    get(fName, allF[[1]])
}

try(findFuncStrict("myFun"))# Error: no version
lm <- function(x) x+1
try(findFuncStrict("lm"))#    Error: 2 versions
findFuncStrict("findFuncStrict")# just 1 version
rm(lm)

## Don't show: 
## because nosegfault runs standardGeneric w/o the methods package, nothing
## really gets tested.  The following check that it catches some errors
mustDie <- function(expr)
   stopifnot(is(tryCatch(expr, error=function(e)e), "error"))

mustDie(standardGeneric()) # 3 tests of requiring a single string
mustDie(standardGeneric(NULL))
mustDie(standardGeneric(""))
mustDie(standardGeneric("notAGenericFunction"))
mustDie(standardGeneric("show"))  # a generic, but not called from its body
## End(Don't show)

## method dumping ------------------------------------

setClass("A", slots = c(a="numeric"))
setMethod("plot", "A", function(x,y,...){ cat("A meth\n") })
dumpMethod("plot","A", file="")
## Not run: 
##D setMethod("plot", "A",
##D function (x, y, ...)
##D {
##D     cat("AAAAA\n")
##D }
##D )
## End(Not run)
tmp <- tempfile()
dumpMethod("plot","A", file=tmp)
## now remove, and see if we can parse the dump
stopifnot(removeMethod("plot", "A"))
source(tmp)
stopifnot(is(getMethod("plot", "A"), "MethodDefinition"))

## same with dumpMethods() :
setClass("B", contains="A")
setMethod("plot", "B", function(x,y,...){ cat("B ...\n") })
dumpMethods("plot", file=tmp)
stopifnot(removeMethod("plot", "A"),
          removeMethod("plot", "B"))
source(tmp)
stopifnot(is(getMethod("plot", "A"), "MethodDefinition"),
          is(getMethod("plot", "B"), "MethodDefinition"))



cleanEx()
nameEx("LanguageClasses")
### * LanguageClasses

flush(stderr()); flush(stdout())

### Name: language-class
### Title: Classes to Represent Unevaluated Language Objects
### Aliases: language-class (-class <--class call-class for-class if-class
###   repeat-class while-class name-class {-class
### Keywords: classes

### ** Examples

showClass("language")

is( quote(sin(x)) ) # "call"  "language"

(ff <- new("if"))  ; is(ff) # "if" "language"
(ff <- new("for")) ; is(ff) # "for" "language"



cleanEx()
nameEx("Methods_for_Nongenerics")
### * Methods_for_Nongenerics

flush(stderr()); flush(stdout())

### Name: Methods_for_Nongenerics
### Title: Methods for Non-Generic Functions in Other Packages
### Aliases: Methods_for_Nongenerics

### ** Examples

## A class that extends a registered S3 class inherits that class' S3
## methods.

setClass("myFrame", contains = "data.frame",
         slots = c(timestamps = "POSIXt"))
df1 <- data.frame(x = 1:10, y = rnorm(10), z = sample(letters,10))
mydf1 <- new("myFrame", df1, timestamps = Sys.time())

## "myFrame" objects inherit "data.frame" S3 methods; e.g., for `[`

## IGNORE_RDIFF_BEGIN
mydf1[1:2, ] # a data frame object (with extra attributes)
## IGNORE_RDIFF_END


## a method explicitly for "myFrame" class

setMethod("[",
    signature(x = "myFrame"),
    function (x, i, j, ..., drop = TRUE)
    {
        S3Part(x) <- callNextMethod()
        x@timestamps <- c(Sys.time(), as.POSIXct(x@timestamps))
        x
    }
)

## IGNORE_RDIFF_BEGIN
mydf1[1:2, ]
## IGNORE_RDIFF_END

setClass("myDateTime", contains = "POSIXt")

now <- Sys.time() # class(now) is c("POSIXct", "POSIXt")
nowLt <- as.POSIXlt(now)# class(nowLt) is c("POSIXlt", "POSIXt")

mCt <- new("myDateTime", now)
mLt <- new("myDateTime", nowLt)

## S3 methods for an S4 object will be selected using S4 inheritance
## Objects mCt and mLt have different S3Class() values, but this is
## not used.
f3 <- function(x)UseMethod("f3") # an S3 generic to illustrate inheritance

f3.POSIXct <- function(x) "The POSIXct result"
f3.POSIXlt <- function(x) "The POSIXlt result"
f3.POSIXt <- function(x) "The POSIXt result"

stopifnot(identical(f3(mCt), f3.POSIXt(mCt)))
stopifnot(identical(f3(mLt), f3.POSIXt(mLt)))



## An S4 object selects S3 methods according to its S4 "inheritance"

setClass("classA", contains = "numeric",
         slots = c(realData = "numeric"))

Math.classA <- function(x) { (getFunction(.Generic))(x@realData) }
setMethod("Math", "classA", Math.classA)


x <- new("classA", log(1:10), realData = 1:10)

stopifnot(identical(abs(x), 1:10))

setClass("classB", contains = "classA")

y <- new("classB", x)

stopifnot(identical(abs(y), abs(x))) # (version 2.9.0 or earlier fails here)

## an S3 generic: just for demonstration purposes
f3 <- function(x, ...) UseMethod("f3")

f3.default <- function(x, ...) "Default f3"

## S3 method (only) for classA
f3.classA <- function(x, ...) "Class classA for f3"

## S3 and S4 method for numeric
f3.numeric <- function(x, ...) "Class numeric for f3"
setMethod("f3", "numeric", f3.numeric)

## The S3 method for classA and the closest inherited S3 method for classB
## are not found.

f3(x); f3(y) # both choose "numeric" method

## to obtain the natural inheritance, set identical S3 and S4 methods
setMethod("f3", "classA", f3.classA)

f3(x); f3(y) # now both choose "classA" method

## Need to define an S3 as well as S4 method to use on an S3 object
## or if called from a package without the S4 generic

MathFun <- function(x) { # a smarter "data.frame" method for Math group
  for (i in seq_len(ncol(x))[sapply(x, is.numeric)])
    x[, i] <- (getFunction(.Generic))(x[, i])
  x
}
setMethod("Math", "data.frame", MathFun)

## S4 method works for an S4 class containing data.frame,
## but not for data.frame objects (not S4 objects)

try(logIris <- log(iris)) #gets an error from the old method

## Define an S3 method with the same computation

Math.data.frame <- MathFun

logIris <- log(iris)




## Don't show: 
removeClass("classA"); removeClass("classB"); rm(x,y)
removeGeneric("f3")
removeClass("myDateTime")
removeMethod("Math", "data.frame"); rm(Math.data.frame, MathFun, logIris)
## End(Don't show)




cleanEx()
nameEx("NextMethod")
### * NextMethod

flush(stderr()); flush(stdout())

### Name: callNextMethod
### Title: Call an Inherited Method
### Aliases: callNextMethod
### Keywords: programming classes methods

### ** Examples

## callNextMethod() used for the Math, Math2 group generic functions

## A class to automatically round numeric results to "d" digits

rnum <- setClass("rnum", slots = c(d = "integer"), contains = "numeric")

## Math functions operate on the rounded numbers, return a plain
## vector.  The next method will always be the default, usually a primitive.
setMethod("Math", "rnum",
          function(x)
              callNextMethod(round(as.numeric(x), x@d)))
setMethod("Math2", "rnum",
          function(x, digits)
              callNextMethod(round(as.numeric(x), x@d), digits))

## Examples of callNextMethod with two arguments in the signature.

## For arithmetic and one rnum with anything, callNextMethod with no arguments
## round the full accuracy result, and return as plain vector
setMethod("Arith", c(e1 ="rnum"),
          function(e1, e2)
              as.numeric(round(callNextMethod(), e1@d)))
setMethod("Arith", c(e2 ="rnum"),
          function(e1, e2)
              as.numeric(round(callNextMethod(), e2@d)))

## A method for BOTH arguments from "rnum" would be ambiguous
## for callNextMethod(): the two methods above are equally valid.
## The method chooses the smaller number of digits,
## and then calls the generic function, postponing the method selection
## until it's not ambiguous.
setMethod("Arith", c(e1 ="rnum", e2 = "rnum"),
          function(e1, e2) {
              if(e1@d <= e2@d)
                  callGeneric(e1, as.numeric(e2))
              else
                  callGeneric(as.numeric(e1), e2)
          })

## For comparisons, callNextMethod with the rounded arguments
setMethod("Compare", c(e1 = "rnum"),
          function(e1, e2)
              callNextMethod(round(e1, e1@d), round(e2, e1@d)))
setMethod("Compare", c(e2 = "rnum"),
          function(e1, e2)
              callNextMethod(round(e1, e2@d), round(e2, e2@d)))

## similarly to the Arith case, the method for two "rnum" objects
## can not unambiguously use callNextMethod().  Instead, we rely on
## The rnum() method inhertited from Math2 to return plain vectors.
setMethod("Compare", c(e1 ="rnum", e2 = "rnum"),
          function(e1, e2) {
              d <- min(e1@d, e2@d)
              callGeneric(round(e1, d), round(e2, d))
          })




set.seed(867)

x1 <- rnum(10*runif(5), d=1L)
x2 <- rnum(10*runif(5), d=2L)

x1+1
x2*2
x1-x2

## Simple examples to illustrate callNextMethod with and without arguments
B0 <- setClass("B0", slots = c(s0 = "numeric"))

## and a function to illustrate callNextMethod

f <- function(x, text = "default") {
    str(x) # print a summary
    paste(text, ":", class(x))
}

setGeneric("f")
setMethod("f", "B0", function(x, text = "B0") {
    cat("B0 method called with s0 =", x@s0, "\n")
    callNextMethod()
})

b0 <- B0(s0 = 1)

## call f() with 2 arguments: callNextMethod passes both to the default method
f(b0, "first test")

## call f() with 1 argument:  the default "B0" is not passed by callNextMethod
f(b0)

## Now, a class that extends B0, with no methods for f()
B1 <- setClass("B1", slots = c(s1 = "character"), contains = "B0")
b1 <- B1(s0 = 2, s1 = "Testing B1")

## the two cases work as before, by inheriting the "B0" method

f(b1, b1@s1)

f(b1)

B2 <- setClass("B2", contains = "B1")

## And, a method for "B2" that calls with explicit arguments.
## Note that the method selection in callNextMethod
## uses the class of the *argument* to consistently select the "B0" method

setMethod("f", "B2", function(x, text = "B1 method") {
    y <- B1(s0 = -x@s0, s1 ="Modified x")
    callNextMethod(y, text)
})

b2 <- B2(s1 = "Testing B2", s0 = 10)

f(b2, b2@s1)

f(b2)


## Be careful:  the argument passed must be legal for the method selected
## Although the argument here is numeric, it's still the "B0" method that's called
setMethod("f", "B2", function(x, text = "B1 method") {
    callNextMethod(x@s0, text)
})

##  Now the call will cause an error:

tryCatch(f(b2), error = function(e) cat(e$message,"\n"))


## Don't show: 
##$
removeClass("B2"); removeClass("B1"); removeClass("B0")

removeGeneric("f")

removeMethods(all=FALSE,"Arith"); removeMethods(all=FALSE,"Compare")
removeMethods(all=FALSE,"Math"); removeMethods(all=FALSE,"Math2")

## tests of multiple callNextMethod
setClass("m1", slots = c(count = "numeric"), contains = "matrix",
         prototype = prototype(count = 0))
mm1 <- new("m1", matrix(1:12, 3,4))
setMethod("[", "m1", function(x, i, j, ..., drop) callNextMethod())

setClass("m2", slots = c(sum = "numeric"), contains = "m1")

setMethod("Ops", c("m1", "m1"), function(e1, e2) {
    as(e1, "matrix") <- callNextMethod()
    e1@count <- max(e1@count, e2@count)+1
    e1})

mm2 <- new("m2", matrix(1:12, 3, 4), sum = sum(1:12))

stopifnot(identical(mm2[,2], 4:6))

setClass("m3", slots = c(rowtags = "character"),contains = "m2")

setMethod("[", signature(x="m3", i = "character", j = "missing",
                         drop = "missing"),
          function(x, i,j, ..., drop) {
              xx <- callNextMethod(x, match(i, x@rowtags),)
              x@.Data <- xx
              x@rowtags <- x@rowtags[match(i, x@rowtags)]
              x})

tm <- matrix(1:12, 4, 3)

mm3 <- new("m3", tm, rowtags = letters[1:4])

mmm <- mm3[c("b", "d")]

stopifnot(identical(mmm,
      new("m3", tm[c(2, 4),], rowtags = c("b", "d"))))

removeClass("m3")
removeClass("m2")
removeClass("m1")

removeMethods(all=FALSE,"[")
removeMethods(all=FALSE,"Ops")
## End(Don't show)




cleanEx()
nameEx("RClassUtils")
### * RClassUtils

flush(stderr()); flush(stdout())

### Name: RClassUtils
### Title: Utilities for Managing Class Definitions
### Aliases: completeSubclasses newClassRepresentation
###   print.classRepresentation setExtendsMetaData setSubclassMetaData
###   subclassesMetaName extendsMetaName classPrototypeDef-class .classEnv
###   classLabel testVirtual makePrototypeFromClassDef newEmptyObject
###   completeClassDefinition getAllSuperClasses superClassDepth
###   isVirtualClass assignClassDef newBasic makeExtends
###   reconcilePropertiesAndPrototype tryNew empty.dump showClass
###   showExtends possibleExtends completeExtends classMetaName
###   methodsPackageMetaName metaNameUndo requireMethods checkAtAssignment
###   checkSlotAssignment defaultPrototype isClassDef validSlotNames
###   getDataPart setDataPart .BasicClasses .BasicVectorClasses
###   .InitBasicClasses .InitMethodsListClass .setCoerceGeneric
###   conditionalExtension-class
### Keywords: internal

### ** Examples

typeof(defaultPrototype()) #-> "S4"

## .classEnv()
meth.ns <- asNamespace("methods")
if(get4 <- !any("package:stats4" == search()))
   require("stats4")
stopifnot(TRUE
 , identical(.classEnv("data.frame"), meth.ns)
 , identical(.classEnv(class(new("data.frame"))), meth.ns)
 , identical(.classEnv(     "mle"       ), meth.ns) # <- *not* 'stats4'
 , identical(.classEnv(class(new("mle"))), asNamespace("stats4"))
 , identical(.classEnv(getClass ("mle") ), asNamespace("stats4"))
 )
if(get4) detach("package:stats4")



cleanEx()
nameEx("RMethodUtils")
### * RMethodUtils

flush(stderr()); flush(stdout())

### Name: RMethodUtils
### Title: Method Utilities
### Aliases: asMethodDefinition standardGeneric-class
###   standardGenericWithTrace-class nonstandardGeneric-class
###   nonstandardGenericFunction-class
###   nonstandardGroupGenericFunction-class OptionalFunction-class
###   PossibleMethod-class optionalMethod-class derivedDefaultMethod-class
###   internalDispatchMethod-class substituteFunctionArgs makeGeneric
###   makeStandardGeneric generic.skeleton defaultDumpName
###   doPrimitiveMethod conformMethod getGeneric getGroup getGroupMembers
###   getMethodsMetaData assignMethodsMetaData matchSignature findUnique
###   MethodAddCoerce .saveImage cacheMetaData cacheGenericsMetaData
###   setPrimitiveMethods missingArg balanceMethodsList sigToEnv
###   rematchDefinition isRematched unRematchDefinition
###   addNextMethod,MethodDefinition-method
###   addNextMethod,MethodWithNext-method addNextMethod .valueClassTest
###   insertClassMethods .ShortPrimitiveSkeletons .EmptyPrimitiveSkeletons
### Keywords: internal

### ** Examples

getGroup("exp")
getGroup("==", recursive = TRUE)

getGroupMembers("Arith")
getGroupMembers("Math")
getGroupMembers("Ops") # -> its sub groups



cleanEx()
nameEx("S3Part")
### * S3Part

flush(stderr()); flush(stdout())

### Name: S3Part
### Title: S4 Classes that Contain S3 Classes
### Aliases: S3Part S3Part<- S3Class S3Class<- isXS3Class slotsFromS3 S4 S3
###   coerce,ANY,S3-method coerce,oldClass,S3-method coerce,ANY,S4-method
###   S3-class
### Keywords: programming classes

### ** Examples


## an "mlm" object, regressing two variables on two others

sepal <- as.matrix(datasets::iris[,c("Sepal.Width", "Sepal.Length")])
fit <- lm(sepal ~ Petal.Length + Petal.Width + Species, data = datasets::iris)
class(fit) # S3 class: "mlm", "lm"

## a class that contains "mlm"
myReg <- setClass("myReg", slots = c(title = "character"), contains = "mlm")

fit2 <- myReg(fit, title = "Sepal Regression for iris data")

fit2 # shows the inherited "mlm" object and the title

identical(S3Part(fit2), as(fit2, "mlm"))

class(as(fit2, "mlm")) # the S4 class, "mlm"

class(as(fit2, "S3")) # the S3 class, c("mlm", "lm")

## An object may contain an S3 class from a subclass of that declared:
xlm <- setClass("xlm", slots = c(eps = "numeric"), contains = "lm")

xfit <- xlm(fit, eps = .Machine$double.eps)

xfit@.S3Class # c("mlm", lm")

## Don't show: 
    removeClass("myReg")
## End(Don't show)



cleanEx()
nameEx("S4groupGeneric")
### * S4groupGeneric

flush(stderr()); flush(stdout())

### Name: S4groupGeneric
### Title: S4 Group Generic Functions
### Aliases: S4groupGeneric GroupGenericFunctions Math Ops Summary Arith
###   Logic Compare Complex Math2
### Keywords: methods

### ** Examples

setClass("testComplex", slots = c(zz = "complex"))
## method for whole group "Complex"
setMethod("Complex", "testComplex",
          function(z) c("groupMethod", callGeneric(z@zz)))
## exception for Arg() :
setMethod("Arg", "testComplex",
          function(z) c("ArgMethod", Arg(z@zz)))
z1 <- 1+2i
z2 <- new("testComplex", zz = z1)
stopifnot(identical(Mod(z2), c("groupMethod", Mod(z1))))
stopifnot(identical(Arg(z2), c("ArgMethod", Arg(z1))))
## Don't show: 
removeMethods("Complex")
removeMethods("Arg")
## End(Don't show)


cleanEx()
nameEx("StructureClasses")
### * StructureClasses

flush(stderr()); flush(stdout())

### Name: StructureClasses
### Title: Classes Corresponding to Basic Structures
### Aliases: structure-class matrix-class array-class ts-class
###   Math,structure-method Ops,structure,vector-method
###   Ops,structure,structure-method Ops,structure,array-method
###   Ops,vector,structure-method Ops,array,structure-method
###   Ops,array,array-method initialize,array-method
###   initialize,matrix-method initialize,ts-method initialize,mts-method
###   show,ts-method
### Keywords: classes

### ** Examples

showClass("structure")

## explore a bit :
showClass("ts")
(ts0 <- new("ts"))
str(ts0)

showMethods("Ops") # six methods from these classes, but maybe many more



cleanEx()
nameEx("as")
### * as

flush(stderr()); flush(stdout())

### Name: as
### Title: Force an Object to Belong to a Class
### Aliases: as as<-
### Keywords: programming classes methods

### ** Examples


## Show all the existing methods for as()
showMethods("coerce")




cleanEx()
nameEx("callGeneric")
### * callGeneric

flush(stderr()); flush(stdout())

### Name: callGeneric
### Title: Call the Current Generic Function from a Method
### Aliases: callGeneric
### Keywords: programming classes methods

### ** Examples

## the method for group generic function Ops
## for signature( e1="structure", e2="vector")
function (e1, e2)
{
    value <- callGeneric(e1@.Data, e2)
    if (length(value) == length(e1)) {
        e1@.Data <- value
        e1
    }
    else value
}

## For more examples
## Not run: 
##D showMethods("Ops", includeDefs = TRUE)
## End(Not run)




cleanEx()
nameEx("canCoerce")
### * canCoerce

flush(stderr()); flush(stdout())

### Name: canCoerce
### Title: Can an Object be Coerced to a Certain S4 Class?
### Aliases: canCoerce
### Keywords: classes methods

### ** Examples

m <- matrix(pi, 2,3)
canCoerce(m, "numeric") # TRUE
canCoerce(m, "array")   # TRUE



cleanEx()
nameEx("cbind2")
### * cbind2

flush(stderr()); flush(stdout())

### Name: cbind2
### Title: Combine two Objects by Columns or Rows
### Aliases: cbind2 rbind2 cbind2-methods cbind2,ANY,ANY-method
###   cbind2,ANY,missing-method rbind2-methods rbind2,ANY,ANY-method
###   rbind2,ANY,missing-method
### Keywords: array manip

### ** Examples

cbind2(1:3, 4)
m <- matrix(3:8, 2,3, dimnames=list(c("a","b"), LETTERS[1:3]))
cbind2(1:2, m) # keeps dimnames from m

## rbind() and cbind() now make use of rbind2()/cbind2() methods
setClass("Num", contains="numeric")
setMethod("cbind2", c("Num", "missing"),
          function(x,y, ...) { cat("Num-miss--meth\n"); as.matrix(x)})
setMethod("cbind2", c("Num","ANY"), function(x,y, ...) {
    cat("Num-A.--method\n") ; cbind(getDataPart(x), y, ...) })
setMethod("cbind2", c("ANY","Num"), function(x,y, ...) {
    cat("A.-Num--method\n") ; cbind(x, getDataPart(y), ...) })

a <- new("Num", 1:3)
trace("cbind2")
cbind(a)
cbind(a, four=4, 7:9)# calling cbind2() twice

cbind(m,a, ch=c("D","E"), a*3)
cbind(1,a, m) # ok with a warning
untrace("cbind2")



cleanEx()
nameEx("className")
### * className

flush(stderr()); flush(stdout())

### Name: className
### Title: Class names including the corresponding package
### Aliases: className multipleClasses className-class
### Keywords: classes programming

### ** Examples

## Not run: 
##D className("vector") # will be found, from package "methods"
##D className("vector", "magic") # OK, even though the class doesn't exist
##D 
##D 
##D className("An unknown class") # Will cause an error
## End(Not run)



cleanEx()
nameEx("classesToAM")
### * classesToAM

flush(stderr()); flush(stdout())

### Name: classesToAM
### Title: Compute an Adjacency Matrix for Superclasses of Class
###   Definitions
### Aliases: classesToAM
### Keywords: classes programming

### ** Examples


## the super- and subclasses of "standardGeneric"
## and "derivedDefaultMethod"
am <- classesToAM(list(class(show), class(getMethod(show))), TRUE)
am

## Not run: 
##D ## the following function depends on the Bioconductor package Rgraphviz
##D plotInheritance <- function(classes, subclasses = FALSE, ...) {
##D     if(!require("Rgraphviz", quietly=TRUE))
##D       stop("Only implemented if Rgraphviz is available")
##D     mm <- classesToAM(classes, subclasses)
##D     classes <- rownames(mm); rownames(mm) <- colnames(mm)
##D     graph <-  new("graphAM", mm, "directed", ...)
##D     plot(graph)
##D     cat("Key:\n", paste(abbreviate(classes), " = ", classes, ", ",
##D         sep = ""),  sep = "", fill = TRUE)
##D     invisible(graph)
##D }
##D 
##D ## The plot of the class inheritance of the package "graph"
##D require(graph)
##D plotInheritance(getClasses("package:graph"))
##D 
## End(Not run)



cleanEx()
nameEx("dotsMethods")
### * dotsMethods

flush(stderr()); flush(stdout())

### Name: dotsMethods
### Title: The Use of '...' in Method Signatures
### Aliases: dotsMethods
### Keywords: programming classes methods

### ** Examples

cc <- function(...)c(...)

setGeneric("cc")

setMethod("cc", "character", function(...)paste(...))

setClassUnion("Number", c("numeric", "complex"))

setMethod("cc", "Number", function(...) sum(...))

setClass("cdate", contains = "character", slots = c(date = "Date"))

setClass("vdate", contains = "vector", slots = c(date = "Date"))

cd1 <- new("cdate", "abcdef", date = Sys.Date())

cd2 <- new("vdate", "abcdef", date = Sys.Date())

stopifnot(identical(cc(letters, character(), cd1),
           paste(letters, character(), cd1))) # the "character" method

stopifnot(identical(cc(letters, character(), cd2),
                    c(letters, character(), cd2)))
# the default, because "vdate" doesn't extend "character"

stopifnot(identical(cc(1:10, 1+1i), sum(1:10, 1+1i))) # the "Number" method

stopifnot(identical(cc(1:10, 1+1i, TRUE), c(1:10, 1+1i, TRUE))) # the default

stopifnot(identical(cc(), c())) # no arguments implies the default method

setGeneric("numMax", function(...)standardGeneric("numMax"))

setMethod("numMax", "numeric", function(...)max(...))
# won't work for complex data
setMethod("numMax", "Number", function(...) paste(...))
# should not be selected w/o complex args

stopifnot(identical(numMax(1:10, pi, 1+1i), paste(1:10, pi, 1+1i)))
stopifnot(identical(numMax(1:10, pi, 1), max(1:10, pi, 1)))

try(numMax(1:10, pi, TRUE)) # should be an error:  no default method

## A generic version of paste(), dispatching on the "..." argument:
setGeneric("paste", signature = "...")

setMethod("paste", "Number", function(..., sep, collapse) c(...))

stopifnot(identical(paste(1:10, pi, 1), c(1:10, pi, 1)))

## Don't show: 
for(gen in c("numMax", "cc", "paste")) removeGeneric(gen)
for(cl in c("Number", "vdate", "cdate")) removeClass(cl)
## End(Don't show)



cleanEx()
nameEx("evalSource")
### * evalSource

flush(stderr()); flush(stdout())

### Name: evalSource
### Title: Use Function Definitions from a Source File without Reinstalling
###   a Package
### Aliases: evalSource insertSource sourceEnvironment-class
### Keywords: programming methods

### ** Examples

## Not run: 
##D ## Suppose package P0 has a source file "all.R"
##D ## First, evaluate the source, and from it
##D ## insert the revised version of methods for summary()
##D   env <- insertSource("./P0/R/all.R", package = "P0",
##D      methods = "summary")
##D ## now test one of the methods, tracing  the version from the source
##D   trace("summary", signature = "myMat", browser, edit = env)
##D ## After testing, remove the browser() call but keep the source
##D   trace("summary", signature = "myMat", edit = env)
##D ## Now insert all the (other) revised functions and methods
##D ## without re-evaluating the source file.
##D ## The package name is included in the object env.
##D   insertSource(env)
## End(Not run)



cleanEx()
nameEx("findMethods")
### * findMethods

flush(stderr()); flush(stdout())

### Name: findMethods
### Title: Description of the Methods Defined for a Generic Function
### Aliases: findMethods findMethodSignatures hasMethods getMethods
###   listOfMethods-class
### Keywords: programming classes methods

### ** Examples

mm <-  findMethods("Ops")
findMethodSignatures(methods = mm)



cleanEx()
nameEx("getClass")
### * getClass

flush(stderr()); flush(stdout())

### Name: getClass
### Title: Get Class Definition
### Aliases: getClass getClassDef
### Keywords: programming classes

### ** Examples

getClass("numeric") ## a built in class

cld <- getClass("thisIsAnUndefinedClass", .Force = TRUE)
cld ## a NULL prototype
## If you are really curious:
utils::str(cld)
## Whereas these generate errors:
try(getClass("thisIsAnUndefinedClass"))
try(getClassDef("thisIsAnUndefinedClass"))



cleanEx()
nameEx("getMethod")
### * getMethod

flush(stderr()); flush(stdout())

### Name: getMethod
### Title: Get or Test for the Definition of a Method
### Aliases: getMethod findMethod existsMethod selectMethod hasMethod
### Keywords: programming classes methods

### ** Examples

testFun <-  function(x)x
setGeneric("testFun")
setMethod("testFun", "numeric", function(x)x+1)

hasMethod("testFun", "numeric") # TRUE

hasMethod("testFun", "integer") #TRUE, inherited

existsMethod("testFun", "integer") #FALSE

hasMethod("testFun") # TRUE, default method

hasMethod("testFun", "ANY")

## Don't show: 
## Verify the example
stopifnot(isGeneric("testFun"),
          hasMethod("testFun", "numeric"),
          hasMethod("testFun", "integer"),
          !existsMethod("testFun", "integer"),
          hasMethod("testFun"),
          hasMethod("testFun", "ANY") )
removeGeneric("testFun")
## End(Don't show)



cleanEx()
nameEx("getPackageName")
### * getPackageName

flush(stderr()); flush(stdout())

### Name: getPackageName
### Title: The Name associated with a Given Package
### Aliases: getPackageName setPackageName packageSlot packageSlot<-
### Keywords: programming

### ** Examples

## all the following usually return "base"
getPackageName(length(search()))
getPackageName(baseenv())
getPackageName(asNamespace("base"))
getPackageName("package:base")




cleanEx()
nameEx("hasArg")
### * hasArg

flush(stderr()); flush(stdout())

### Name: hasArg
### Title: Look for an Argument in the Call
### Aliases: hasArg
### Keywords: programming

### ** Examples

ftest <- function(x1, ...) c(hasArg(x1), hasArg("y2"))

ftest(1) ## c(TRUE, FALSE)
ftest(1, 2)  ## c(TRUE, FALSE)
ftest(y2 = 2)   ## c(FALSE, TRUE)
ftest(y = 2)    ## c(FALSE, FALSE) (no partial matching)
ftest(y2 = 2, x = 1)  ## c(TRUE, TRUE) partial match x1



cleanEx()
nameEx("implicitGeneric")
### * implicitGeneric

flush(stderr()); flush(stdout())

### Name: implicitGeneric
### Title: Manage Implicit Versions of Generic Functions
### Aliases: implicitGeneric setGenericImplicit prohibitGeneric
###   registerImplicitGenerics 'implicit generic'
### Keywords: programming methods

### ** Examples


### How we would make the function with() into a generic:

## Since the second argument, 'expr' is used literally, we want
## with() to only have "data" in the signature.

## Not run: 
##D setGeneric("with", signature = "data")
##D ## Now we could predefine methods for "with" if we wanted to.
##D 
##D ## When ready, we store the generic as implicit, and restore the
##D original
##D 
##D setGenericImplicit("with")
## End(Not run)

implicitGeneric("with")

# (This implicit generic is stored in the 'methods' package.)



cleanEx()
nameEx("inheritedSlotNames")
### * inheritedSlotNames

flush(stderr()); flush(stdout())

### Name: inheritedSlotNames
### Title: Names of Slots Inherited From a Super Class
### Aliases: inheritedSlotNames
### Keywords: classes methods

### ** Examples

.srch <- search()
library(stats4)
inheritedSlotNames("mle")

if(require("Matrix", quietly = TRUE)) withAutoprint({
  inheritedSlotNames("Matrix")       # NULL
  ## whereas
  inheritedSlotNames("sparseMatrix") # --> Dim & Dimnames
  ##  i.e. inherited from "Matrix" class
  cl <- getClass("dgCMatrix")        # six slots, etc
  inheritedSlotNames(cl) # *all* six slots are inherited
})
## Not run: 
##D 
##D 
##D ## detach package we've attached above:
##D for(n in rev(which(is.na(match(search(), .srch)))))
##D    try( detach(pos = n) )
## End(Not run)



cleanEx()
nameEx("is")
### * is

flush(stderr()); flush(stdout())

### Name: is
### Title: Is an Object from a Class?
### Aliases: is extends
### Keywords: programming classes methods

### ** Examples

## Not run: 
##D ## this example can be run if package XRPython from CRAN is installed.
##D supers <- extends("PythonInterface")
##D ## find all the superclasses from package XR
##D fromXR <- sapply(supers,
##D     function(what) getClassDef(what)@package == "XR")
##D ## print them
##D supers[fromXR]
##D 
##D ## find all the superclasses at distance 2
##D superRelations <- extends("PythonInterface", fullInfo = TRUE)
##D dist2 <- sapply(superRelations,
##D     function(what) is(what, "SClassExtension") && what@distance == 2)
##D ## print them
##D names(superRelations)[dist2]
##D 
## End(Not run)



cleanEx()
nameEx("isSealedMethod")
### * isSealedMethod

flush(stderr()); flush(stdout())

### Name: isSealedMethod
### Title: Check for a Sealed Method or Class
### Aliases: isSealedMethod isSealedClass
### Keywords: programming classes classes methods

### ** Examples

## these are both TRUE
isSealedMethod("+", c("numeric", "character"))
isSealedClass("matrix")

setClass("track", slots = c(x="numeric", y="numeric"))
## but this is FALSE
isSealedClass("track")
## and so is this
isSealedClass("A Name for an undefined Class")
## and so are these, because only one of the two arguments is basic
isSealedMethod("+", c("track", "numeric"))
isSealedMethod("+", c("numeric", "track"))

## Don't show: 
removeClass("track")
## End(Don't show)



cleanEx()
nameEx("localRefClass")
### * localRefClass

flush(stderr()); flush(stdout())

### Name: LocalReferenceClasses
### Title: Localized Objects based on Reference Classes
### Aliases: LocalReferenceClasses localRefClass-class
###   $<-,localRefClass-method
### Keywords: programming classes

### ** Examples

## class "myIter" has a BigData field for the real (big) data
## and a "twiddle" field for some parameters that it twiddles
## ( for some reason)

myIter <- setRefClass("myIter", contains = "localRefClass",
  fields = list(BigData = "numeric", twiddle = "numeric"))

tw <- rnorm(3)
x1 <- myIter(BigData = rnorm(1000), twiddle = tw) # OK, not REALLY big

twiddler <- function(x, n) {
  x$ensureLocal() # see the Details.  Not really needed in this example
  for(i in seq_len(n)) {
      x$twiddle <- x$twiddle + rnorm(length(x$twiddle))
      ## then do something ....
      ## Snooping in gdb, etc will show that x$BigData is not copied
  }
  return(x)
}

x2 <- twiddler(x1, 10)

stopifnot(identical(x1$twiddle, tw), !identical(x1$twiddle, x2$twiddle))




cleanEx()
nameEx("method.skeleton")
### * method.skeleton

flush(stderr()); flush(stdout())

### Name: method.skeleton
### Title: Create a Skeleton File for a New Method
### Aliases: method.skeleton
### Keywords: programming methods

### ** Examples

## Don't show: 
oWD <- setwd(tempdir())
## End(Don't show)
setClass("track", slots = c(x ="numeric", y="numeric"))
method.skeleton("show", "track")            ## writes show_track.R
method.skeleton("Ops", c("track", "track")) ## writes "Ops_track_track.R"

## write multiple method skeletons to one file
con <- file("./Math_track.R", "w")
method.skeleton("Math", "track", con)
method.skeleton("exp", "track", con)
method.skeleton("log", "track", con)
close(con)
## Don't show: 
setwd(oWD)
## End(Don't show)



cleanEx()
nameEx("new")
### * new

flush(stderr()); flush(stdout())

### Name: new
### Title: Generate an Object from a Class
### Aliases: new initialize
### Keywords: programming classes

### ** Examples

## using the definition of class "track" from setClass

## Don't show: 
setClass("track", slots = c(x="numeric", y="numeric"))
setClass("trackCurve", contains = "track",
          slots = c(smooth = "numeric"))

ydata <- stats::rnorm(10); ysmooth <- 1:10
## End(Don't show)

## a new object with two slots specified
t1 <- new("track", x = seq_along(ydata), y = ydata)

# a new object including an object from a superclass, plus a slot
t2 <- new("trackCurve", t1, smooth = ysmooth)

### define a method for initialize, to ensure that new objects have
### equal-length x and y slots.  In this version, the slots must still be
### supplied by name.

setMethod("initialize", "track", 
    function(.Object, ...) {
      .Object <- callNextMethod()
      if(length(.Object@x) != length(.Object@y))
      stop("specified x and y of different lengths")
      .Object
    })

### An alternative version that allows x and y to be supplied
### unnamed.  A still more friendly version would make the default x
### a vector of the same length as y, and vice versa.

setMethod("initialize", "track",
          function(.Object, x = numeric(0), y = numeric(0), ...) {
              .Object <- callNextMethod(.Object, ...)
              if(length(x) != length(y))
                  stop("specified x and y of different lengths")
              .Object@x <- x
              .Object@y <- y
              .Object
          })

## Don't show: 
removeMethod("initialize", "track")
## End(Don't show)



cleanEx()
nameEx("nonStructure-class")
### * nonStructure-class

flush(stderr()); flush(stdout())

### Name: nonStructure-class
### Title: A non-structure S4 Class for basic types
### Aliases: nonStructure-class Math,nonStructure-method
###   Math2,nonStructure-method Ops,vector,nonStructure-method
###   Ops,nonStructure,vector-method Ops,nonStructure,nonStructure-method
### Keywords: classes

### ** Examples

setClass("NumericNotStructure", contains = c("numeric","nonStructure"))
xx <- new("NumericNotStructure", 1:10)
xx + 1 # vector
log(xx) # vector
sample(xx) # vector
## Don't show: 
removeClass("NumericNotStructure")
## End(Don't show)



cleanEx()
nameEx("promptClass")
### * promptClass

flush(stderr()); flush(stdout())

### Name: promptClass
### Title: Generate a Shell for Documentation of a Formal Class
### Aliases: promptClass
### Keywords: programming classes

### ** Examples

## Don't show: 
## from setClass
## A simple class with two slots
setClass("track",
         slots = c(x="numeric", y="numeric"))
## A class extending the previous, adding one more slot
setClass("trackCurve", contains = "track",
         slots = c(smooth = "numeric"))
## A class similar to "trackCurve", but with different structure
## allowing matrices for the "y" and "smooth" slots
setClass("trackMultiCurve",
         slots = c(x="numeric", y="matrix", smooth="matrix"),
         prototype = list(x=numeric(), y=matrix(0,0,0), smooth= matrix(0,0,0)))

setIs("trackMultiCurve", "trackCurve",
  test = function(obj) {ncol(slot(obj, "y")) == 1},
  coerce = function(obj) { new("trackCurve", x = slot(obj, "x"),
        y = as.numeric(slot(obj,"y")), smooth = as.numeric(slot(obj, "smooth")))})

## from setMethod
require(graphics)

setMethod("plot", "track",
 function(x, y, ...) plot(slot(x, "y"), y,  ...)
)
setMethod("plot", c("trackCurve", "missing"),
function(x, y, ...) {
  plot(as(x, "track"))
  if(length(slot(x, "smooth") > 0))
    lines(slot(x, "x"), slot(x, "smooth"))
  }
)

promptClass("trackMultiCurve", stdout())

promptClass("track", stdout())
## End(Don't show)
## Not run: 
##D > promptClass("track")
##D A shell of class documentation has been written to the
##D file "track-class.Rd".
## End(Not run)
## Don't show: 
removeMethods("plot")
## End(Don't show)


cleanEx()
nameEx("refClass")
### * refClass

flush(stderr()); flush(stdout())

### Name: ReferenceClasses
### Title: Objects With Fields Treated by Reference (OOP-style)
### Aliases: ReferenceClasses setRefClass getRefClass initFieldArgs
###   initRefFields activeBindingFunction-class
###   defaultBindingFunction-class uninitializedField-class
###   refClassRepresentation-class refObjectGenerator-class
###   refGeneratorSlot-class refClass-class refObject-class
###   refMethodDef-class refMethodDefWithTrace-class SuperClassMethod-class
###   show,envRefClass-method show,refMethodDef-method
###   show,externalRefMethod-method show,refClassRepresentation-method
###   externalRefMethod externalRefMethod-class
### Keywords: programming classes

### ** Examples

## a simple editor for matrix objects.  Method  $edit() changes some
## range of values; method $undo() undoes the last edit.
mEdit <- setRefClass("mEdit",
      fields = list( data = "matrix",
        edits = "list"))

## The basic edit, undo methods
mEdit$methods(
     edit = function(i, j, value) {
       ## the following string documents the edit method
       'Replaces the range [i, j] of the
        object by value.
        '
         backup <-
             list(i, j, data[i,j])
         data[i,j] <<- value
         edits <<- c(edits, list(backup))
         invisible(value)
     },
     undo = function() {
       'Undoes the last edit() operation
        and update the edits field accordingly.
        '
         prev <- edits
         if(length(prev)) prev <- prev[[length(prev)]]
         else stop("No more edits to undo")
         edit(prev[[1]], prev[[2]], prev[[3]])
         ## trim the edits list
         length(edits) <<- length(edits) - 2
         invisible(prev)
     })

## A method to automatically print objects
mEdit$methods(
     show = function() {
       'Method for automatically printing matrix editors'
       cat("Reference matrix editor object of class",
          classLabel(class(.self)), "\n")
       cat("Data: \n")
       methods::show(data)
       cat("Undo list is of length", length(edits), "\n")
     }
     )

xMat <- matrix(1:12,4,3)
xx <- mEdit(data = xMat)
xx$edit(2, 2, 0)
xx
xx$undo()
mEdit$help("undo")
stopifnot(all.equal(xx$data, xMat))

utils::str(xx) # show fields and names of methods

## A method to save the object
mEdit$methods(
     save = function(file) {
       'Save the current object on the file
        in R external object format.
       '
         base::save(.self, file = file)
     }
)

tf <- tempfile()
xx$save(tf)
## Don't show: 
load(tf)
unlink(tf)
stopifnot(identical(xx$data, .self$data))
## End(Don't show)

## Not run: 
##D ## Inheriting a reference class:  a matrix viewer
##D mv <- setRefClass("matrixViewer",
##D     fields = c("viewerDevice", "viewerFile"),
##D     contains = "mEdit",
##D     methods = list( view = function() {
##D         dd <- dev.cur(); dev.set(viewerDevice)
##D         devAskNewPage(FALSE)
##D         matplot(data, main = paste("After",length(edits),"edits"))
##D         dev.set(dd)},
##D         edit = # invoke previous method, then replot
##D           function(i, j, value) {
##D             callSuper(i, j, value)
##D             view()
##D           }))
##D 
##D ## initialize and finalize methods
##D mv$methods( initialize =
##D   function(file = "./matrixView.pdf", ...) {
##D     viewerFile <<- file
##D     pdf(viewerFile)
##D     viewerDevice <<- dev.cur()
##D     dev.set(dev.prev())
##D     callSuper(...)
##D   },
##D   finalize = function() {
##D     dev.off(viewerDevice)
##D   })
##D 
##D ## debugging an object: call browser() in method $edit()
##D xx$trace(edit, browser)
##D 
##D ## debugging all objects from class mEdit in method $undo()
##D mEdit$trace(undo, browser)
## End(Not run)
## Don't show: 
removeClass("mEdit")
resetGeneric("$")
resetGeneric("initialize")
## End(Don't show) 



cleanEx()
nameEx("representation")
### * representation

flush(stderr()); flush(stdout())

### Name: representation
### Title: Construct a Representation or a Prototype for a Class Definition
### Aliases: representation prototype
### Keywords: programming classes

### ** Examples

## representation for a new class with a directly define slot "smooth"
## which should be a "numeric" object, and extending class "track"
representation("track", smooth ="numeric")
## Don't show: 
prev <- getClassDef("class3")
setClass("class1", representation(a="numeric", b = "character"))
setClass("class2", representation(a2 = "numeric", b = "numeric"))
try(setClass("class3", representation("class1", "class2")))
{if(is.null(prev))
  stopifnot(!isClass("class3"))
else
  stopifnot(identical(getClassDef("class3"), prev))}
## End(Don't show)

###  >>> This *is* old syntax -- use 'contains=*, slots=*' instead <<<
###                ==========         ----------  ------   ======


setClass("Character",representation("character"))
setClass("TypedCharacter",representation("Character",type="character"),
          prototype(character(0),type="plain"))
ttt <- new("TypedCharacter", "foo", type = "character")
## Don't show: 
stopifnot(identical(as(ttt, "character"), "foo"))
## End(Don't show)

setClass("num1", representation(comment = "character"),
         contains = "numeric",
         prototype = prototype(pi, comment = "Start with pi"))

## Don't show: 
stopifnot(identical(new("num1"), new("num1", pi, comment = "Start with pi")))
for(cl in c("num1", "TypedCharacter", "Character", "class2", "class1"))
    removeClass(cl)
## End(Don't show)




cleanEx()
nameEx("selectSuperClasses")
### * selectSuperClasses

flush(stderr()); flush(stdout())

### Name: selectSuperClasses
### Title: Super Classes (of Specific Kinds) of a Class
### Aliases: selectSuperClasses .selectSuperClasses
### Keywords: programming classes

### ** Examples

setClass("Root")
setClass("Base", contains = "Root", slots = c(length = "integer"))
setClass("A", contains = "Base", slots = c(x = "numeric"))
setClass("B", contains = "Base", slots = c(y = "character"))
setClass("C", contains = c("A", "B"))

extends("C")   #-->  "C"  "A" "B"  "Base" "Root"
selectSuperClasses("C") # "A" "B"
selectSuperClasses("C", directOnly=FALSE) # "A" "B"  "Base"  "Root"
selectSuperClasses("C", dropVirtual=TRUE, directOnly=FALSE)# ditto w/o "Root"



cleanEx()
nameEx("setAs")
### * setAs

flush(stderr()); flush(stdout())

### Name: setAs
### Title: Methods for Coercing an Object to a Class
### Aliases: coerce coerce<- setAs coerce-methods coerce,ANY,array-method
###   coerce,ANY,call-method coerce,ANY,character-method
###   coerce,ANY,complex-method coerce,ANY,environment-method
###   coerce,ANY,expression-method coerce,ANY,function-method
###   coerce,ANY,integer-method coerce,ANY,list-method
###   coerce,ANY,logical-method coerce,ANY,matrix-method
###   coerce,ANY,name-method coerce,ANY,numeric-method
###   coerce,ANY,single-method coerce,ANY,ts-method
###   coerce,ANY,vector-method coerce,ANY,NULL-method
### Keywords: programming classes methods

### ** Examples

## using the definition of class "track" from setClass

## Don't show: 
setClass("track", slots = c(x="numeric", y="numeric"))
setClass("trackCurve", contains = "track", slots = c(smooth = "numeric"))
## End(Don't show)

setAs("track", "numeric", function(from) from@y)

t1 <- new("track", x=1:20, y=(1:20)^2)

as(t1, "numeric")

## The next example shows:
##  1. A virtual class to define setAs for several classes at once.
##  2. as() using inherited information

setClass("ca", slots = c(a = "character", id = "numeric"))

setClass("cb", slots = c(b = "character", id = "numeric"))

setClass("id")
setIs("ca", "id")
setIs("cb", "id")


setAs("id", "numeric", function(from) from@id)

CA <- new("ca", a = "A", id = 1)
CB <- new("cb", b = "B", id = 2)

setAs("cb", "ca", function(from, to )new(to, a=from@b, id = from@id))

as(CB, "numeric")

## Don't show: 
## should generate an error (should have been a function of one argument)
try(setAs("track", "numeric", function(x, y,z)x@y))
## End(Don't show)



cleanEx()
nameEx("setClass")
### * setClass

flush(stderr()); flush(stdout())

### Name: setClass
### Title: Create a Class Definition
### Aliases: setClass classGeneratorFunction-class
### Keywords: programming classes methods

### ** Examples

## Don't show: 
 if(isClass("trackMultiCurve")) removeClass("trackMultiCurve")
 if(isClass("trackCurve"))      removeClass("trackCurve")
 if(isClass("track"))           removeClass("track")
## End(Don't show)
## A simple class with two slots
track <- setClass("track", slots = c(x="numeric", y="numeric"))
## an object from the class
t1 <- track(x = 1:10, y = 1:10 + rnorm(10))

## A class extending the previous, adding one more slot
trackCurve <- setClass("trackCurve",
		slots = c(smooth = "numeric"),
		contains = "track")

## an object containing a superclass object
t1s <- trackCurve(t1, smooth = 1:10)

## A class similar to "trackCurve", but with different structure
## allowing matrices for the "y" and "smooth" slots
setClass("trackMultiCurve",
         slots = c(x="numeric", y="matrix", smooth="matrix"),
         prototype = list(x=numeric(), y=matrix(0,0,0),
                          smooth= matrix(0,0,0)))

## A class that extends the built-in data type "numeric"

numWithId <- setClass("numWithId", slots = c(id = "character"),
         contains = "numeric")

numWithId(1:3, id = "An Example")

## inherit from reference object of type "environment"
stampedEnv <- setClass("stampedEnv", contains = "environment",
                       slots = c(update = "POSIXct"))
setMethod("[[<-", c("stampedEnv", "character", "missing"),
   function(x, i, j, ..., value) {
       ev <- as(x, "environment")
       ev[[i]] <- value  #update the object in the environment
       x@update <- Sys.time() # and the update time
       x})


e1 <- stampedEnv(update = Sys.time())

e1[["noise"]] <- rnorm(10)

## Don't show: 
tMC <- new("trackMultiCurve")
is.matrix(slot(tMC, "y"))
is.matrix(slot(tMC, "smooth"))
setClass("myMatrix", "matrix", prototype = matrix(0,0,0))
nrow(new("myMatrix")) # 0
nrow(new("matrix")) # 1
## simple test of prototype data
xxx <- stats::rnorm(3)
setClass("xNum", slots = c(x = "numeric"), prototype = list(x = xxx))
stopifnot(identical(new("xNum")@x, xxx))

removeClass("xNum")
removeClass("myMatrix")

## The following should not be needed.  But make check removes all files
## between example files, in a crude way that does not cause the class
## information to be reset.  There seems no way to detect this, so we
## have to remove classes ourselves

removeClass("trackMultiCurve")
removeClass("trackCurve")
removeClass("track")
## End(Don't show)



cleanEx()
nameEx("setClassUnion")
### * setClassUnion

flush(stderr()); flush(stdout())

### Name: setClassUnion
### Title: Classes Defined as the Union of Other Classes
### Aliases: setClassUnion isClassUnion ClassUnionRepresentation-class
### Keywords: programming classes

### ** Examples

## a class for either numeric or logical data
setClassUnion("maybeNumber", c("numeric", "logical"))

## use the union as the data part of another class
setClass("withId", contains = "maybeNumber", slots = c(id = "character"))

w1 <- new("withId", 1:10, id = "test 1")
w2 <- new("withId", sqrt(w1)%%1 < .01, id = "Perfect squares")

## add class "complex" to the union "maybeNumber"
setIs("complex", "maybeNumber")

w3 <- new("withId", complex(real = 1:10, imaginary = sqrt(1:10)))

## a class union containing the existing class  union "OptionalFunction"
setClassUnion("maybeCode",
    c("expression", "language", "OptionalFunction"))

is(quote(sqrt(1:10)), "maybeCode")  ## TRUE
## Don't show: 
## The following test is less trivial than it looks.
## It depends on the assignment of the data part NOT performing a
## strict coerce to "numeric" on the way to satisfying
## is(ttt, "maybeNumber").
stopifnot(identical(w1@.Data, 1:10))
removeClass("withId")
removeClass("maybeNumber")
## End(Don't show)




cleanEx()
nameEx("setGeneric")
### * setGeneric

flush(stderr()); flush(stdout())

### Name: setGeneric
### Title: Create a Generic Version of a Function
### Aliases: setGeneric
### Keywords: programming methods

### ** Examples


## Specify that this package will define methods for plot()
setGeneric("plot")

## create a new generic function, with a default method
setGeneric("props", function(object) attributes(object))

###   A non-standard generic function.  It insists that the methods
###   return a non-empty character vector (a stronger requirement than
###    valueClass = "character" in the call to setGeneric)

setGeneric("authorNames",
    function(text) {
      value <- standardGeneric("authorNames")
      if(!(is(value, "character") && any(nchar(value)>0)))
        stop("authorNames methods must return non-empty strings")
      value
      })

## the asRObject generic function, from package XR
## Its default method just returns object
## See the reference, Chapter 12 for methods

setGeneric("asRObject", function(object, evaluator) {
        object
})


## Don't show: 
setMethod("authorNames", "character", function(text)text)

tryIt <- function(expr) tryCatch(expr, error = function(e) e)
stopifnot(identical(authorNames(c("me", "you")), c("me", "you")),
          is(tryIt(authorNames(character())), "error"), # empty value
          is(tryIt(authorNames(NULL)), "error"))        # no default method
## End(Don't show)
## Don't show: 
removeGeneric("authorNames")
removeGeneric("props")
removeGeneric("asRObject")
## End(Don't show)



cleanEx()
nameEx("setGroupGeneric")
### * setGroupGeneric

flush(stderr()); flush(stdout())

### Name: setGroupGeneric
### Title: Create a Group Generic Version of a Function
### Aliases: setGroupGeneric
### Keywords: programming methods

### ** Examples

## Not run: 
##D ## the definition of the "Logic" group generic in the methods package
##D setGroupGeneric("Logic", function(e1, e2) NULL,
##D     knownMembers = c("&", "|"))
## End(Not run)



cleanEx()
nameEx("setIs")
### * setIs

flush(stderr()); flush(stdout())

### Name: setIs
### Title: Specify a Superclass Explicitly
### Aliases: setIs
### Keywords: programming classes methods

### ** Examples

## Don't show: 
## A simple class with two slots
setClass("track",
         slots = c(x="numeric", y="numeric"))
## A class extending the previous, adding one more slot
## End(Don't show)
## Two examples of setIs() with coerce= and replace= arguments
## The first one works fairly well, because neither class has many
## inherited methods do be disturbed by the new inheritance

## The second example does NOT work well, because the new superclass,
## "factor", causes methods to be inherited that should not be.

## First example:
## a class definition (see setClass for class "track")
setClass("trackCurve", contains = "track",
         slots = c( smooth = "numeric"))
## A class similar to "trackCurve", but with different structure
## allowing matrices for the "y" and "smooth" slots
setClass("trackMultiCurve",
         slots = c(x="numeric", y="matrix", smooth="matrix"),
         prototype = structure(list(), x=numeric(), y=matrix(0,0,0),

                               smooth= matrix(0,0,0)))
## Automatically convert an object from class "trackCurve" into
## "trackMultiCurve", by making the y, smooth slots into 1-column matrices
setIs("trackCurve",
      "trackMultiCurve",
      coerce = function(obj) {
        new("trackMultiCurve",
            x = obj@x,
            y = as.matrix(obj@y),
            smooth = as.matrix(obj@smooth))
      },
      replace = function(obj, value) {
        obj@y <- as.matrix(value@y)
        obj@x <- value@x
        obj@smooth <- as.matrix(value@smooth)
        obj})


## Don't show: 
removeClass("trackMultiCurve")
removeClass("trackCurve")
removeClass("track")
## End(Don't show)

## Second Example:
## A class that adds a slot to "character"
setClass("stringsDated", contains = "character",
         slots = c(stamp="POSIXt"))

## Convert automatically to a factor by explicit coerce
setIs("stringsDated", "factor",
      coerce = function(from) factor(from@.Data),
      replace= function(from, value) {
                  from@.Data <- as.character(value); from })
## Don't show: 
set.seed(750)
## End(Don't show)
ll <- sample(letters, 10, replace = TRUE)
ld <- new("stringsDated", ll, stamp = Sys.time())

levels(as(ld, "factor"))
levels(ld) # will be NULL--see comment in section on inheritance above.

## In contrast, a class that simply extends "factor"
## has no such ambiguities
setClass("factorDated", contains = "factor",
         slots = c(stamp="POSIXt"))
fd <- new("factorDated", factor(ll), stamp = Sys.time())
identical(levels(fd), levels(as(fd, "factor")))



cleanEx()
nameEx("setLoadActions")
### * setLoadActions

flush(stderr()); flush(stdout())

### Name: setLoadActions
### Title: Set Actions For Package Loading
### Aliases: setLoadAction setLoadActions getLoadActions hasLoadAction
###   evalOnLoad evalqOnLoad
### Keywords: package

### ** Examples

## Not run: 
##D ## in the code for some package
##D 
##D ## ... somewhere else
##D setLoadActions(function(ns)
##D    cat("Loaded package", sQuote(getNamespaceName(ns)),
##D        "at", format(Sys.time()), "\n"),
##D   setCount = function(ns) assign("myCount", 1, envir = ns),
##D   function(ns) assign("myPointer", getMyExternalPointer(), envir = ns))
##D   ... somewhere later
##D if(countShouldBe0)
##D   setLoadAction(function(ns) assign("myCount", 0, envir = ns), "setCount")
## End(Not run)



cleanEx()
nameEx("setMethod")
### * setMethod

flush(stderr()); flush(stdout())

### Name: setMethod
### Title: Create and Save a Method
### Aliases: setMethod
### Keywords: programming classes methods

### ** Examples


## examples for a simple class with two numeric slots.
## (Run example(setMethod) to see the class and function definitions)
## Don't show: 
  setClass("track", slots = c(x="numeric", y = "numeric"))

  cumdist <- function(x, y) c(0., cumsum(sqrt(diff(x)^2 + diff(y)^2)))
  setClass("trackMultiCurve", slots = c(x="numeric", y="matrix", smooth="matrix"),
          prototype = list(x=numeric(), y=matrix(0,0,0), smooth= matrix(0,0,0)))

require(graphics)
## End(Don't show)

## methods for plotting track objects 
##
## First, with only one object as argument, plot the two slots
##  y must be included in the signature, it would default to "ANY"
setMethod("plot", signature(x="track", y="missing"),
  function(x,  y, ...) plot(x@x, x@y, ...)
)

## plot numeric data on either axis against a track object
## (reducing the track object to the cumulative distance along the track)
## Using a short form for the signature, which matches like formal arguments
setMethod("plot", c("track", "numeric"),
 function(x, y, ...) plot(cumdist(x@x, x@y), y,  xlab = "Distance",...)
)

## and similarly for the other axis
setMethod("plot", c("numeric", "track"),
 function(x, y, ...) plot(x, cumdist(y@x, y@y),  ylab = "Distance",...)
)

t1 <- new("track", x=1:20, y=(1:20)^2)
plot(t1)
plot(qnorm(ppoints(20)), t1)

## Now a class that inherits from "track", with a vector for data at
## the points 
  setClass("trackData", contains = c("numeric", "track"))


tc1 <- new("trackData", t1, rnorm(20))


## a method for plotting the object
## This method has an extra argument, allowed because ... is an
## argument to the generic function.
setMethod("plot", c("trackData", "missing"),
function(x, y, maxRadius = max(par("cin")), ...) {
  plot(x@x, x@y, type = "n", ...)
  symbols(x@x, x@y, circles = abs(x), inches = maxRadius)
  }
)
plot(tc1)

## Without other methods for "trackData", methods for "track"
## will be selected by inheritance

plot(qnorm(ppoints(20)), tc1)

## defining methods for primitive function.
## Although "[" and "length" are not ordinary functions
## methods can be defined for them.
setMethod("[", "track",
  function(x, i, j, ..., drop) {
    x@x <- x@x[i]; x@y <- x@y[i]
    x
  })
plot(t1[1:15])

setMethod("length", "track", function(x)length(x@y))
length(t1)

## Methods for binary operators
## A method for the group generic "Ops" will apply to all operators
## unless a method for a more specific operator has been defined.

## For one trackData argument, go on with just the data part
setMethod("Ops", signature(e1 = "trackData"),
    function(e1, e2) callGeneric(e1@.Data, e2))

setMethod("Ops", signature(e2 = "trackData"),
    function(e1, e2) callGeneric(e1, e2@.Data))

## At this point, the choice of a method for a call with BOTH
## arguments from "trackData" is ambiguous.  We must define a method.

setMethod("Ops", signature(e1 = "trackData", e2 = "trackData"),
    function(e1, e2) callGeneric(e1@.Data, e2@.Data))
## (well, really we should only do this if the "track" part
## of the two arguments matched)

tc1 +1

1/tc1

all(tc1 == tc1)

## Don't show: 
removeClass("trackData")
removeClass("track")
## End(Don't show)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("setOldClass")
### * setOldClass

flush(stderr()); flush(stdout())

### Name: setOldClass
### Title: Register Old-Style (S3) Classes and Inheritance
### Aliases: setOldClass .setOldIs POSIXct-class POSIXlt-class POSIXt-class
###   aov-class maov-class anova-class anova.glm-class anova.glm.null-class
###   Date-class data.frame-class data.frameRowLabels-class density-class
###   dump.frames-class factor-class formula-class glm-class glm.null-class
###   hsearch-class integrate-class libraryIQR-class lm-class logLik-class
###   mlm-class mtable-class mts-class ordered-class packageIQR-class
###   packageInfo-class recordedplot-class rle-class socket-class
###   summaryDefault-class summary.table-class oldClass-class
###   .OldClassesList table-class initialize,data.frame-method
###   initialize,factor-method initialize,ordered-method
###   initialize,table-method initialize,summary.table-method
### Keywords: programming methods

### ** Examples

## Don't show: 
## All the predefined S3 classes with S4 versions
sort(unlist(.OldClassesList))
## End(Don't show)

require(stats)

## "lm" and "mlm" are predefined; if they were not this would do it:
## Not run: 
##D setOldClass(c("mlm", "lm"))
## End(Not run)

## Define a new generic function to compute the residual degrees of freedom
setGeneric("dfResidual",
  function(model) stop(gettextf(
    "This function only works for fitted model objects, not class %s",
                                class(model))))

setMethod("dfResidual", "lm", function(model)model$df.residual)

## dfResidual will work on mlm objects as well as lm objects
myData <- data.frame(time = 1:10, y = (1:10)^.5)
myLm <- lm(cbind(y, y^3)  ~ time, myData)

## Don't show: 
showClass("data.frame")# to see the predefined S4 "oldClass"
## End(Don't show)

## two examples extending S3 class "lm": class "xlm" directly
## and "ylm" indirectly
setClass("xlm", slots = c(eps = "numeric"), contains = "lm")
setClass("ylm", slots = c(header = "character"), contains = "xlm")
ym1 = new("ylm", myLm, header = "Example", eps = 0.)
## for more examples, see ?S3Class.


## Don't show: 
stopifnot(identical(dfResidual(myLm), myLm$df.residual))
removeClass("ylm"); removeClass("xlm")
rm(myData, myLm)
removeGeneric("dfResidual")
## End(Don't show)

## Not run: 
##D ## The code in R that defines "ts" as an S4 class
##D setClass("ts", contains = "structure", slots = c(tsp = "numeric"),
##D          prototype(NA, tsp = rep(1,3)))
##D        # prototype to be a legal S3 time-series
##D ## and now registers it as an S3 class
##D setOldClass("ts", S4Class = "ts", where = envir)
## End(Not run)




cleanEx()
nameEx("show")
### * show

flush(stderr()); flush(stdout())

### Name: show
### Title: Show an Object
### Aliases: show show-methods show,ANY-method show,traceable-method
###   show,ObjectsWithPackage-method show,MethodDefinition-method
###   show,MethodWithNext-method show,genericFunction-method
###   show,classRepresentation-method
### Keywords: programming

### ** Examples

## following the example shown in the setMethod documentation ...
setClass("track", slots = c(x="numeric", y="numeric"))
setClass("trackCurve", contains = "track", slots = c(smooth = "numeric"))

t1 <- new("track", x=1:20, y=(1:20)^2)

tc1 <- new("trackCurve", t1)

setMethod("show", "track",
  function(object)print(rbind(x = object@x, y=object@y))
)
## The method will now be used for automatic printing of t1

t1

## Not run: 
##D   [,1] [,2] [,3] [,4] [,5] [,6] [,7] [,8] [,9] [,10] [,11] [,12]
##D x    1    2    3    4    5    6    7    8    9    10    11    12
##D y    1    4    9   16   25   36   49   64   81   100   121   144
##D   [,13] [,14] [,15] [,16] [,17] [,18] [,19] [,20]
##D x    13    14    15    16    17    18    19    20
##D y   169   196   225   256   289   324   361   400
## End(Not run)
## and also for tc1, an object of a class that extends "track"
tc1

## Not run: 
##D   [,1] [,2] [,3] [,4] [,5] [,6] [,7] [,8] [,9] [,10] [,11] [,12]
##D x    1    2    3    4    5    6    7    8    9    10    11    12
##D y    1    4    9   16   25   36   49   64   81   100   121   144
##D   [,13] [,14] [,15] [,16] [,17] [,18] [,19] [,20]
##D x    13    14    15    16    17    18    19    20
##D y   169   196   225   256   289   324   361   400
## End(Not run)



cleanEx()
nameEx("showMethods")
### * showMethods

flush(stderr()); flush(stdout())

### Name: showMethods
### Title: Show all the methods for the specified function(s) or class
### Aliases: showMethods .S4methods
### Keywords: methods

### ** Examples

require(graphics)
## Don't show: 
 setClass("track", slots = c(x="numeric", y="numeric"))
 ## First, with only one object as argument:
 setMethod("plot", signature(x="track", y="missing"),
           function(x,  y, ...) plot(slot(x, "x"), slot(x, "y"), ...))
 ## Second, plot the data from the track on the y-axis against anything
 ## as the x data.
 setMethod("plot", signature(y = "track"),
           function(x, y, ...) plot(x, slot(y, "y"), ...))
 setMethod("plot", "track",
           function(x, y, ...) plot(slot(x, "y"), y,  ...))
## End(Don't show)
## Assuming the methods for plot
## are set up as in the example of help(setMethod),
## print (without definitions) the methods that involve class "track":
showMethods("plot", classes = "track")
## Not run: 
##D # Function "plot":
##D # x = ANY, y = track
##D # x = track, y = missing
##D # x = track, y = ANY
##D 
##D require("Matrix")
##D showMethods("%*%")# many!
##D     methods(class = "Matrix")# nothing
##D showMethods(class = "Matrix")# everything
##D showMethods(Matrix:::isDiagonal) # a non-exported generic
## End(Not run)

if(no4 <- is.na(match("stats4", loadedNamespaces())))
   loadNamespace("stats4")
showMethods(classes = "mle") # -> a method for show()
if(no4) unloadNamespace("stats4")



cleanEx()
nameEx("slot")
### * slot

flush(stderr()); flush(stdout())

### Name: slot
### Title: The Slots in an Object from a Formal Class
### Aliases: slot .hasSlot slot<- slotNames .slotNames getSlots
### Keywords: programming classes

### ** Examples

## Don't show: 
if(isClass("track")) removeClass("track")
## End(Don't show)

setClass("track", slots = c(x="numeric", y="numeric"))
myTrack <- new("track", x = -4:4, y = exp(-4:4))
slot(myTrack, "x")
slot(myTrack, "y") <- log(slot(myTrack, "y"))
utils::str(myTrack)

getSlots("track") # or
getSlots(getClass("track"))
slotNames(class(myTrack)) # is the same as
slotNames(myTrack)

## Don't show: 
removeClass("track")##  should not be needed... see ./setClass.Rd
## End(Don't show)



cleanEx()
nameEx("testInheritedMethods")
### * testInheritedMethods

flush(stderr()); flush(stdout())

### Name: testInheritedMethods
### Title: Test for and Report about Selection of Inherited Methods
### Aliases: testInheritedMethods MethodSelectionReport-class .Other-class
### Keywords: programming classes methods

### ** Examples

## if no other attached packages have methods for `+` or its group
## generic functions, this returns a 16 by 2 matrix of selection
## patterns (in R 2.9.0)
testInheritedMethods("+")



cleanEx()
nameEx("validObject")
### * validObject

flush(stderr()); flush(stdout())

### Name: validObject
### Title: Test the Validity of an Object
### Aliases: validObject getValidity setValidity
### Keywords: programming classes

### ** Examples

setClass("track",
          slots = c(x="numeric", y = "numeric"))
t1 <- new("track", x=1:10, y=sort(stats::rnorm(10)))
## A valid "track" object has the same number of x, y values
validTrackObject <- function(object) {
    if(length(object@x) == length(object@y)) TRUE
    else paste("Unequal x,y lengths: ", length(object@x), ", ",
               length(object@y), sep="")
}
## assign the function as the validity method for the class
setValidity("track", validTrackObject)
## t1 should be a valid "track" object
validObject(t1)
## Now we do something bad
t2 <- t1
t2@x <- 1:20
## This should generate an error
## Not run: try(validObject(t2))
## Don't show: 
stopifnot(is(try(validObject(t2)), "try-error"))
## End(Don't show)

setClass("trackCurve", contains = "track",
         slots = c(smooth = "numeric"))

## all superclass validity methods are used when validObject
## is called from initialize() with arguments, so this fails
## Not run: trynew("trackCurve", t2)
## Don't show: 
stopifnot(is(try(new("trackCurve", t2)), "try-error"))
## End(Don't show)

setClass("twoTrack", slots = c(tr1 = "track", tr2 ="track"))

## validity tests are not applied recursively by default,
## so this object is created (invalidly)
tT  <- new("twoTrack", tr2 = t2)

## A stricter test detects the problem
## Not run: try(validObject(tT, complete = TRUE))
## Don't show: 
stopifnot(is(try(validObject(tT, complete = TRUE)), "try-error"))
## End(Don't show)
