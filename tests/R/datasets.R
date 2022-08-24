pkgname <- "datasets"
source(file.path(R.home("share"), "R", "examples-header.R"))
options(warn = 1)
library('datasets')

base::assign(".oldSearch", base::search(), pos = 'CheckExEnv')
base::assign(".old_wd", base::getwd(), pos = 'CheckExEnv')
cleanEx()
nameEx("AirPassengers")
### * AirPassengers

flush(stderr()); flush(stdout())

### Name: AirPassengers
### Title: Monthly Airline Passenger Numbers 1949-1960
### Aliases: AirPassengers
### Keywords: datasets

### ** Examples

## Not run: 
##D ## These are quite slow and so not run by example(AirPassengers)
##D 
##D ## The classic 'airline model', by full ML
##D (fit <- arima(log10(AirPassengers), c(0, 1, 1),
##D               seasonal = list(order = c(0, 1, 1), period = 12)))
##D update(fit, method = "CSS")
##D update(fit, x = window(log10(AirPassengers), start = 1954))
##D pred <- predict(fit, n.ahead = 24)
##D tl <- pred$pred - 1.96 * pred$se
##D tu <- pred$pred + 1.96 * pred$se
##D ts.plot(AirPassengers, 10^tl, 10^tu, log = "y", lty = c(1, 2, 2))
##D 
##D ## full ML fit is the same if the series is reversed, CSS fit is not
##D ap0 <- rev(log10(AirPassengers))
##D attributes(ap0) <- attributes(AirPassengers)
##D arima(ap0, c(0, 1, 1), seasonal = list(order = c(0, 1, 1), period = 12))
##D arima(ap0, c(0, 1, 1), seasonal = list(order = c(0, 1, 1), period = 12),
##D       method = "CSS")
##D 
##D ## Structural Time Series
##D ap <- log10(AirPassengers) - 2
##D (fit <- StructTS(ap, type = "BSM"))
##D par(mfrow = c(1, 2))
##D plot(cbind(ap, fitted(fit)), plot.type = "single")
##D plot(cbind(ap, tsSmooth(fit)), plot.type = "single")
## End(Not run)


cleanEx()
nameEx("BOD")
### * BOD

flush(stderr()); flush(stdout())

### Name: BOD
### Title: Biochemical Oxygen Demand
### Aliases: BOD
### Keywords: datasets

### ** Examples

## Don't show: 
options(show.nls.convergence=FALSE)
old <- options(digits = 5)
## End(Don't show)
require(stats)
# simplest form of fitting a first-order model to these data
fm1 <- nls(demand ~ A*(1-exp(-exp(lrc)*Time)), data = BOD,
           start = c(A = 20, lrc = log(.35)))
coef(fm1)
fm1
# using the plinear algorithm  (trace o/p differs by platform)
## IGNORE_RDIFF_BEGIN
fm2 <- nls(demand ~ (1-exp(-exp(lrc)*Time)), data = BOD,
           start = c(lrc = log(.35)), algorithm = "plinear", trace = TRUE)
## IGNORE_RDIFF_END
# using a self-starting model
fm3 <- nls(demand ~ SSasympOrig(Time, A, lrc), data = BOD)
summary(fm3)
## Don't show: 
options(old)
## End(Don't show)



cleanEx()
nameEx("ChickWeight")
### * ChickWeight

flush(stderr()); flush(stdout())

### Name: ChickWeight
### Title: Weight versus age of chicks on different diets
### Aliases: ChickWeight
### Keywords: datasets

### ** Examples


cleanEx()
nameEx("DNase")
### * DNase

flush(stderr()); flush(stdout())

### Name: DNase
### Title: Elisa assay of DNase
### Aliases: DNase
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## Don't show: 
options(show.nls.convergence=FALSE)
## End(Don't show)
coplot(density ~ conc | Run, data = DNase,
       show.given = FALSE, type = "b")
coplot(density ~ log(conc) | Run, data = DNase,
       show.given = FALSE, type = "b")
## fit a representative run
fm1 <- nls(density ~ SSlogis( log(conc), Asym, xmid, scal ),
    data = DNase, subset = Run == 1)
## compare with a four-parameter logistic
fm2 <- nls(density ~ SSfpl( log(conc), A, B, xmid, scal ),
    data = DNase, subset = Run == 1)
summary(fm2)
anova(fm1, fm2)



cleanEx()
nameEx("Formaldehyde")
### * Formaldehyde

flush(stderr()); flush(stdout())

### Name: Formaldehyde
### Title: Determination of Formaldehyde
### Aliases: Formaldehyde
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
plot(optden ~ carb, data = Formaldehyde,
     xlab = "Carbohydrate (ml)", ylab = "Optical Density",
     main = "Formaldehyde data", col = 4, las = 1)
abline(fm1 <- lm(optden ~ carb, data = Formaldehyde))
summary(fm1)
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0))
plot(fm1)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("HairEyeColor")
### * HairEyeColor

flush(stderr()); flush(stdout())

### Name: HairEyeColor
### Title: Hair and Eye Color of Statistics Students
### Aliases: HairEyeColor
### Keywords: datasets

### ** Examples

require(graphics)
## Full mosaic
mosaicplot(HairEyeColor)
## Aggregate over sex (as in Snee's original data)
x <- apply(HairEyeColor, c(1, 2), sum)
x
mosaicplot(x, main = "Relation between hair and eye color")



cleanEx()
nameEx("Harman23.cor")
### * Harman23.cor

flush(stderr()); flush(stdout())

### Name: Harman23.cor
### Title: Harman Example 2.3
### Aliases: Harman23.cor
### Keywords: datasets

### ** Examples

require(stats)
(Harman23.FA <- factanal(factors = 1, covmat = Harman23.cor))
for(factors in 2:4) print(update(Harman23.FA, factors = factors))



cleanEx()
nameEx("Harman74.cor")
### * Harman74.cor

flush(stderr()); flush(stdout())

### Name: Harman74.cor
### Title: Harman Example 7.4
### Aliases: Harman74.cor
### Keywords: datasets

### ** Examples

require(stats)
(Harman74.FA <- factanal(factors = 1, covmat = Harman74.cor))
for(factors in 2:5) print(update(Harman74.FA, factors = factors))
Harman74.FA <- factanal(factors = 5, covmat = Harman74.cor,
                        rotation = "promax")
print(Harman74.FA$loadings, sort = TRUE)



cleanEx()
nameEx("InsectSprays")
### * InsectSprays

flush(stderr()); flush(stdout())

### Name: InsectSprays
### Title: Effectiveness of Insect Sprays
### Aliases: InsectSprays
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
boxplot(count ~ spray, data = InsectSprays,
        xlab = "Type of spray", ylab = "Insect count",
        main = "InsectSprays data", varwidth = TRUE, col = "lightgray")
fm1 <- aov(count ~ spray, data = InsectSprays)
summary(fm1)
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0))
plot(fm1)
fm2 <- aov(sqrt(count) ~ spray, data = InsectSprays)
summary(fm2)
plot(fm2)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("JohnsonJohnson")
### * JohnsonJohnson

flush(stderr()); flush(stdout())

### Name: JohnsonJohnson
### Title: Quarterly Earnings per Johnson & Johnson Share
### Aliases: JohnsonJohnson
### Keywords: datasets

### ** Examples


cleanEx()
nameEx("LifeCycleSavings")
### * LifeCycleSavings

flush(stderr()); flush(stdout())

### Name: LifeCycleSavings
### Title: Intercountry Life-Cycle Savings Data
### Aliases: LifeCycleSavings
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
pairs(LifeCycleSavings, panel = panel.smooth,
      main = "LifeCycleSavings data")
fm1 <- lm(sr ~ pop15 + pop75 + dpi + ddpi, data = LifeCycleSavings)
summary(fm1)



cleanEx()
nameEx("Loblolly")
### * Loblolly

flush(stderr()); flush(stdout())

### Name: Loblolly
### Title: Growth of Loblolly pine trees
### Aliases: Loblolly
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
plot(height ~ age, data = Loblolly, subset = Seed == 329,
     xlab = "Tree age (yr)", las = 1,
     ylab = "Tree height (ft)",
     main = "Loblolly data and fitted curve (Seed 329 only)")
fm1 <- nls(height ~ SSasymp(age, Asym, R0, lrc),
           data = Loblolly, subset = Seed == 329)
age <- seq(0, 30, length.out = 101)
lines(age, predict(fm1, list(age = age)))



cleanEx()
nameEx("Nile")
### * Nile

flush(stderr()); flush(stdout())

### Name: Nile
### Title: Flow of the River Nile
### Aliases: Nile
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
par(mfrow = c(2, 2))
plot(Nile)
acf(Nile)
pacf(Nile)
ar(Nile) # selects order 2
cpgram(ar(Nile)$resid)
par(mfrow = c(1, 1))
arima(Nile, c(2, 0, 0))

## Now consider missing values, following Durbin & Koopman
NileNA <- Nile
NileNA[c(21:40, 61:80)] <- NA
arima(NileNA, c(2, 0, 0))
plot(NileNA)
pred <-
   predict(arima(window(NileNA, 1871, 1890), c(2, 0, 0)), n.ahead = 20)
lines(pred$pred, lty = 3, col = "red")
lines(pred$pred + 2*pred$se, lty = 2, col = "blue")
lines(pred$pred - 2*pred$se, lty = 2, col = "blue")
pred <-
   predict(arima(window(NileNA, 1871, 1930), c(2, 0, 0)), n.ahead = 20)
lines(pred$pred, lty = 3, col = "red")
lines(pred$pred + 2*pred$se, lty = 2, col = "blue")
lines(pred$pred - 2*pred$se, lty = 2, col = "blue")

## Structural time series models
par(mfrow = c(3, 1))
plot(Nile)
## local level model
(fit <- StructTS(Nile, type = "level"))
lines(fitted(fit), lty = 2)              # contemporaneous smoothing
lines(tsSmooth(fit), lty = 2, col = 4)   # fixed-interval smoothing
plot(residuals(fit)); abline(h = 0, lty = 3)
## local trend model
(fit2 <- StructTS(Nile, type = "trend")) ## constant trend fitted
pred <- predict(fit, n.ahead = 30)
## with 50% confidence interval
ts.plot(Nile, pred$pred,
        pred$pred + 0.67*pred$se, pred$pred -0.67*pred$se)

## Now consider missing values
plot(NileNA)
(fit3 <- StructTS(NileNA, type = "level"))
lines(fitted(fit3), lty = 2)
lines(tsSmooth(fit3), lty = 3)
plot(residuals(fit3)); abline(h = 0, lty = 3)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("Orange")
### * Orange

flush(stderr()); flush(stdout())

### Name: Orange
### Title: Growth of Orange Trees
### Aliases: Orange
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
coplot(circumference ~ age | Tree, data = Orange, show.given = FALSE)
fm1 <- nls(circumference ~ SSlogis(age, Asym, xmid, scal),
           data = Orange, subset = Tree == 3)
plot(circumference ~ age, data = Orange, subset = Tree == 3,
     xlab = "Tree age (days since 1968/12/31)",
     ylab = "Tree circumference (mm)", las = 1,
     main = "Orange tree data and fitted model (Tree 3 only)")
age <- seq(0, 1600, length.out = 101)
lines(age, predict(fm1, list(age = age)))



cleanEx()
nameEx("OrchardSprays")
### * OrchardSprays

flush(stderr()); flush(stdout())

### Name: OrchardSprays
### Title: Potency of Orchard Sprays
### Aliases: OrchardSprays
### Keywords: datasets

### ** Examples

require(graphics)
pairs(OrchardSprays, main = "OrchardSprays data")



cleanEx()
nameEx("PlantGrowth")
### * PlantGrowth

flush(stderr()); flush(stdout())

### Name: PlantGrowth
### Title: Results from an Experiment on Plant Growth
### Aliases: PlantGrowth
### Keywords: datasets

### ** Examples

## One factor ANOVA example from Dobson's book, cf. Table 7.4:
require(stats); require(graphics)
boxplot(weight ~ group, data = PlantGrowth, main = "PlantGrowth data",
        ylab = "Dried weight of plants", col = "lightgray",
        notch = TRUE, varwidth = TRUE)
anova(lm(weight ~ group, data = PlantGrowth))



cleanEx()
nameEx("Puromycin")
### * Puromycin

flush(stderr()); flush(stdout())

### Name: Puromycin
### Title: Reaction Velocity of an Enzymatic Reaction
### Aliases: Puromycin
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## Don't show: 
options(show.nls.convergence=FALSE)
## End(Don't show)
plot(rate ~ conc, data = Puromycin, las = 1,
     xlab = "Substrate concentration (ppm)",
     ylab = "Reaction velocity (counts/min/min)",
     pch = as.integer(Puromycin$state),
     col = as.integer(Puromycin$state),
     main = "Puromycin data and fitted Michaelis-Menten curves")
## simplest form of fitting the Michaelis-Menten model to these data
fm1 <- nls(rate ~ Vm * conc/(K + conc), data = Puromycin,
           subset = state == "treated",
           start = c(Vm = 200, K = 0.05))
fm2 <- nls(rate ~ Vm * conc/(K + conc), data = Puromycin,
           subset = state == "untreated",
           start = c(Vm = 160, K = 0.05))
summary(fm1)
summary(fm2)
## add fitted lines to the plot
conc <- seq(0, 1.2, length.out = 101)
lines(conc, predict(fm1, list(conc = conc)), lty = 1, col = 1)
lines(conc, predict(fm2, list(conc = conc)), lty = 2, col = 2)
legend(0.8, 120, levels(Puromycin$state),
       col = 1:2, lty = 1:2, pch = 1:2)

## using partial linearity
fm3 <- nls(rate ~ conc/(K + conc), data = Puromycin,
           subset = state == "treated", start = c(K = 0.05),
           algorithm = "plinear")



cleanEx()
nameEx("Theoph")
### * Theoph

flush(stderr()); flush(stdout())

### Name: Theoph
### Title: Pharmacokinetics of Theophylline
### Aliases: Theoph
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## Don't show: 
options(show.nls.convergence=FALSE)
## End(Don't show)
coplot(conc ~ Time | Subject, data = Theoph, show.given = FALSE)
Theoph.4 <- subset(Theoph, Subject == 4)
fm1 <- nls(conc ~ SSfol(Dose, Time, lKe, lKa, lCl),
           data = Theoph.4)
summary(fm1)
plot(conc ~ Time, data = Theoph.4,
     xlab = "Time since drug administration (hr)",
     ylab = "Theophylline concentration (mg/L)",
     main = "Observed concentrations and fitted model",
     sub  = "Theophylline data - Subject 4 only",
     las = 1, col = 4)
xvals <- seq(0, par("usr")[2], length.out = 55)
lines(xvals, predict(fm1, newdata = list(Time = xvals)),
      col = 4)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("Titanic")
### * Titanic

flush(stderr()); flush(stdout())

### Name: Titanic
### Title: Survival of passengers on the Titanic
### Aliases: Titanic
### Keywords: datasets

### ** Examples

require(graphics)
mosaicplot(Titanic, main = "Survival on the Titanic")
## Higher survival rates in children?
apply(Titanic, c(3, 4), sum)
## Higher survival rates in females?
apply(Titanic, c(2, 4), sum)
## Use loglm() in package 'MASS' for further analysis ...



cleanEx()
nameEx("ToothGrowth")
### * ToothGrowth

flush(stderr()); flush(stdout())

### Name: ToothGrowth
### Title: The Effect of Vitamin C on Tooth Growth in Guinea Pigs
### Aliases: ToothGrowth
### Keywords: datasets

### ** Examples

require(graphics)
coplot(len ~ dose | supp, data = ToothGrowth, panel = panel.smooth,
       xlab = "ToothGrowth data: length vs dose, given type of supplement")



cleanEx()
nameEx("UCBAdmissions")
### * UCBAdmissions

flush(stderr()); flush(stdout())

### Name: UCBAdmissions
### Title: Student Admissions at UC Berkeley
### Aliases: UCBAdmissions
### Keywords: datasets

### ** Examples

require(graphics)
## Data aggregated over departments
apply(UCBAdmissions, c(1, 2), sum)
mosaicplot(apply(UCBAdmissions, c(1, 2), sum),
           main = "Student admissions at UC Berkeley")
## Data for individual departments
opar <- par(mfrow = c(2, 3), oma = c(0, 0, 2, 0))
for(i in 1:6)
  mosaicplot(UCBAdmissions[,,i],
    xlab = "Admit", ylab = "Sex",
    main = paste("Department", LETTERS[i]))
mtext(expression(bold("Student admissions at UC Berkeley")),
      outer = TRUE, cex = 1.5)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("UKDriverDeaths")
### * UKDriverDeaths

flush(stderr()); flush(stdout())

### Name: UKDriverDeaths
### Title: Road Casualties in Great Britain 1969-84
### Aliases: UKDriverDeaths Seatbelts
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## work with pre-seatbelt period to identify a model, use logs
work <- window(log10(UKDriverDeaths), end = 1982+11/12)
par(mfrow = c(3, 1))
plot(work); acf(work); pacf(work)
par(mfrow = c(1, 1))
(fit <- arima(work, c(1, 0, 0), seasonal = list(order = c(1, 0, 0))))
z <- predict(fit, n.ahead = 24)
ts.plot(log10(UKDriverDeaths), z$pred, z$pred+2*z$se, z$pred-2*z$se,
        lty = c(1, 3, 2, 2), col = c("black", "red", "blue", "blue"))

## now see the effect of the explanatory variables
X <- Seatbelts[, c("kms", "PetrolPrice", "law")]
X[, 1] <- log10(X[, 1]) - 4
arima(log10(Seatbelts[, "drivers"]), c(1, 0, 0),
      seasonal = list(order = c(1, 0, 0)), xreg = X)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("UKLungDeaths")
### * UKLungDeaths

flush(stderr()); flush(stdout())

### Name: UKLungDeaths
### Title: Monthly Deaths from Lung Diseases in the UK
### Aliases: UKLungDeaths ldeaths fdeaths mdeaths
### Keywords: datasets

### ** Examples

require(stats); require(graphics) # for time
plot(ldeaths)
plot(mdeaths, fdeaths)
## Better labels:
yr <- floor(tt <- time(mdeaths))
plot(mdeaths, fdeaths,
     xy.labels = paste(month.abb[12*(tt - yr)], yr-1900, sep = "'"))



cleanEx()
nameEx("UKgas")
### * UKgas

flush(stderr()); flush(stdout())

### Name: UKgas
### Title: UK Quarterly Gas Consumption
### Aliases: UKgas
### Keywords: datasets

### ** Examples

## maybe str(UKgas) ; plot(UKgas) ...



cleanEx()
nameEx("USArrests")
### * USArrests

flush(stderr()); flush(stdout())

### Name: USArrests
### Title: Violent Crime Rates by US State
### Aliases: USArrests
### Keywords: datasets

### ** Examples

summary(USArrests)

require(graphics)
pairs(USArrests, panel = panel.smooth, main = "USArrests data")

## Difference between 'USArrests' and its correction
USArrests["Maryland", "UrbanPop"] # 67 -- the transcription error
UA.C <- USArrests
UA.C["Maryland", "UrbanPop"] <- 76.6

## also +/- 0.5 to restore the original  <n>.5  percentages
s5u <- c("Colorado", "Florida", "Mississippi", "Wyoming")
s5d <- c("Nebraska", "Pennsylvania")
UA.C[s5u, "UrbanPop"] <- UA.C[s5u, "UrbanPop"] + 0.5
UA.C[s5d, "UrbanPop"] <- UA.C[s5d, "UrbanPop"] - 0.5

## ==> UA.C  is now a *C*orrected version of  USArrests



cleanEx()
nameEx("USJudgeRatings")
### * USJudgeRatings

flush(stderr()); flush(stdout())

### Name: USJudgeRatings
### Title: Lawyers' Ratings of State Judges in the US Superior Court
### Aliases: USJudgeRatings
### Keywords: datasets

### ** Examples

require(graphics)
pairs(USJudgeRatings, main = "USJudgeRatings data")



cleanEx()
nameEx("USPersonalExpenditure")
### * USPersonalExpenditure

flush(stderr()); flush(stdout())

### Name: USPersonalExpenditure
### Title: Personal Expenditure Data
### Aliases: USPersonalExpenditure
### Keywords: datasets

### ** Examples

require(stats) # for medpolish
USPersonalExpenditure
medpolish(log10(USPersonalExpenditure))



cleanEx()
nameEx("VADeaths")
### * VADeaths

flush(stderr()); flush(stdout())

### Name: VADeaths
### Title: Death Rates in Virginia (1940)
### Aliases: VADeaths
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
n <- length(dr <- c(VADeaths))
nam <- names(VADeaths)
d.VAD <- data.frame(
 Drate = dr,
 age = rep(ordered(rownames(VADeaths)), length.out = n),
 gender = gl(2, 5, n, labels = c("M", "F")),
 site =  gl(2, 10, labels = c("rural", "urban")))
coplot(Drate ~ as.numeric(age) | gender * site, data = d.VAD,
       panel = panel.smooth, xlab = "VADeaths data - Given: gender")
summary(aov.VAD <- aov(Drate ~ .^2, data = d.VAD))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0))
plot(aov.VAD)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("WWWusage")
### * WWWusage

flush(stderr()); flush(stdout())

### Name: WWWusage
### Title: Internet Usage per Minute
### Aliases: WWWusage
### Keywords: datasets

### ** Examples

require(graphics)
work <- diff(WWWusage)
par(mfrow = c(2, 1)); plot(WWWusage); plot(work)
## Not run: 
##D require(stats)
##D aics <- matrix(, 6, 6, dimnames = list(p = 0:5, q = 0:5))
##D for(q in 1:5) aics[1, 1+q] <- arima(WWWusage, c(0, 1, q),
##D     optim.control = list(maxit = 500))$aic
##D for(p in 1:5)
##D    for(q in 0:5) aics[1+p, 1+q] <- arima(WWWusage, c(p, 1, q),
##D        optim.control = list(maxit = 500))$aic
##D round(aics - min(aics, na.rm = TRUE), 2)
## End(Not run)


graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("WorldPhones")
### * WorldPhones

flush(stderr()); flush(stdout())

### Name: WorldPhones
### Title: The World's Telephones
### Aliases: WorldPhones
### Keywords: datasets

### ** Examples

require(graphics)
matplot(rownames(WorldPhones), WorldPhones, type = "b", log = "y",
        xlab = "Year", ylab = "Number of telephones (1000's)")
legend(1951.5, 80000, colnames(WorldPhones), col = 1:6, lty = 1:5,
       pch = rep(21, 7))
title(main = "World phones data: log scale for response")



cleanEx()
nameEx("ability.cov")
### * ability.cov

flush(stderr()); flush(stdout())

### Name: ability.cov
### Title: Ability and Intelligence Tests
### Aliases: ability.cov
### Keywords: datasets

### ** Examples


cleanEx()
nameEx("airmiles")
### * airmiles

flush(stderr()); flush(stdout())

### Name: airmiles
### Title: Passenger Miles on Commercial US Airlines, 1937-1960
### Aliases: airmiles
### Keywords: datasets

### ** Examples

require(graphics)
plot(airmiles, main = "airmiles data",
     xlab = "Passenger-miles flown by U.S. commercial airlines", col = 4)



cleanEx()
nameEx("airquality")
### * airquality

flush(stderr()); flush(stdout())

### Name: airquality
### Title: New York Air Quality Measurements
### Aliases: airquality
### Keywords: datasets

### ** Examples

require(graphics)
pairs(airquality, panel = panel.smooth, main = "airquality data")



cleanEx()
nameEx("anscombe")
### * anscombe

flush(stderr()); flush(stdout())

### Name: anscombe
### Title: Anscombe's Quartet of 'Identical' Simple Linear Regressions
### Aliases: anscombe
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
summary(anscombe)

##-- now some "magic" to do the 4 regressions in a loop:
ff <- y ~ x
mods <- setNames(as.list(1:4), paste0("lm", 1:4))
for(i in 1:4) {
  ff[2:3] <- lapply(paste0(c("y","x"), i), as.name)
  ## or   ff[[2]] <- as.name(paste0("y", i))
  ##      ff[[3]] <- as.name(paste0("x", i))
  mods[[i]] <- lmi <- lm(ff, data = anscombe)
  print(anova(lmi))
}

## See how close they are (numerically!)
sapply(mods, coef)
lapply(mods, function(fm) coef(summary(fm)))

## Now, do what you should have done in the first place: PLOTS
op <- par(mfrow = c(2, 2), mar = 0.1+c(4,4,1,1), oma =  c(0, 0, 2, 0))
for(i in 1:4) {
  ff[2:3] <- lapply(paste0(c("y","x"), i), as.name)
  plot(ff, data = anscombe, col = "red", pch = 21, bg = "orange", cex = 1.2,
       xlim = c(3, 19), ylim = c(3, 13))
  abline(mods[[i]], col = "blue")
}
mtext("Anscombe's 4 Regression data sets", outer = TRUE, cex = 1.5)
par(op)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("attenu")
### * attenu

flush(stderr()); flush(stdout())

### Name: attenu
### Title: The Joyner-Boore Attenuation Data
### Aliases: attenu
### Keywords: datasets

### ** Examples

require(graphics)
## check the data class of the variables
sapply(attenu, data.class)
summary(attenu)
pairs(attenu, main = "attenu data")
coplot(accel ~ dist | as.factor(event), data = attenu, show.given = FALSE)
coplot(log(accel) ~ log(dist) | as.factor(event),
       data = attenu, panel = panel.smooth, show.given = FALSE)



cleanEx()
nameEx("attitude")
### * attitude

flush(stderr()); flush(stdout())

### Name: attitude
### Title: The Chatterjee-Price Attitude Data
### Aliases: attitude
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
pairs(attitude, main = "attitude data")
summary(attitude)
summary(fm1 <- lm(rating ~ ., data = attitude))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0),
            mar = c(4.1, 4.1, 2.1, 1.1))
plot(fm1)
summary(fm2 <- lm(rating ~ complaints, data = attitude))
plot(fm2)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("beavers")
### * beavers

flush(stderr()); flush(stdout())

### Name: beavers
### Title: Body Temperature Series of Two Beavers
### Aliases: beavers beaver1 beaver2
### Keywords: datasets

### ** Examples

require(graphics)
(yl <- range(beaver1$temp, beaver2$temp))

beaver.plot <- function(bdat, ...) {
  nam <- deparse(substitute(bdat))
  with(bdat, {
    # Hours since start of day:
    hours <- time %/% 100 + 24*(day - day[1]) + (time %% 100)/60
    plot (hours, temp, type = "l", ...,
          main = paste(nam, "body temperature"))
    abline(h = 37.5, col = "gray", lty = 2)
    is.act <- activ == 1
    points(hours[is.act], temp[is.act], col = 2, cex = .8)
  })
}
op <- par(mfrow = c(2, 1), mar = c(3, 3, 4, 2), mgp = 0.9 * 2:0)
 beaver.plot(beaver1, ylim = yl)
 beaver.plot(beaver2, ylim = yl)
par(op)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("cars")
### * cars

flush(stderr()); flush(stdout())

### Name: cars
### Title: Speed and Stopping Distances of Cars
### Aliases: cars
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
plot(cars, xlab = "Speed (mph)", ylab = "Stopping distance (ft)",
     las = 1)
lines(lowess(cars$speed, cars$dist, f = 2/3, iter = 3), col = "red")
title(main = "cars data")
plot(cars, xlab = "Speed (mph)", ylab = "Stopping distance (ft)",
     las = 1, log = "xy")
title(main = "cars data (logarithmic scales)")
lines(lowess(cars$speed, cars$dist, f = 2/3, iter = 3), col = "red")
summary(fm1 <- lm(log(dist) ~ log(speed), data = cars))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0),
            mar = c(4.1, 4.1, 2.1, 1.1))
plot(fm1)
par(opar)

## An example of polynomial regression
plot(cars, xlab = "Speed (mph)", ylab = "Stopping distance (ft)",
    las = 1, xlim = c(0, 25))
d <- seq(0, 25, length.out = 200)
for(degree in 1:4) {
  fm <- lm(dist ~ poly(speed, degree), data = cars)
  assign(paste("cars", degree, sep = "."), fm)
  lines(d, predict(fm, data.frame(speed = d)), col = degree)
}
anova(cars.1, cars.2, cars.3, cars.4)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("chickwts")
### * chickwts

flush(stderr()); flush(stdout())

### Name: chickwts
### Title: Chicken Weights by Feed Type
### Aliases: chickwts
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
boxplot(weight ~ feed, data = chickwts, col = "lightgray",
    varwidth = TRUE, notch = TRUE, main = "chickwt data",
    ylab = "Weight at six weeks (gm)")
anova(fm1 <- lm(weight ~ feed, data = chickwts))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0),
            mar = c(4.1, 4.1, 2.1, 1.1))
plot(fm1)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("co2")
### * co2

flush(stderr()); flush(stdout())

### Name: co2
### Title: Mauna Loa Atmospheric CO2 Concentration
### Aliases: co2
### Keywords: datasets

### ** Examples

require(graphics)
plot(co2, ylab = expression("Atmospheric concentration of CO"[2]),
     las = 1)
title(main = "co2 data set")



cleanEx()
nameEx("crimtab")
### * crimtab

flush(stderr()); flush(stdout())

### Name: crimtab
### Title: Student's 3000 Criminals Data
### Aliases: crimtab
### Keywords: datasets

### ** Examples

require(stats)
dim(crimtab)
utils::str(crimtab)
## for nicer printing:
local({cT <- crimtab
       colnames(cT) <- substring(colnames(cT), 2, 3)
       print(cT, zero.print = " ")
})

## Repeat Student's experiment:

# 1) Reconstitute 3000 raw data for heights in inches and rounded to
#    nearest integer as in Student's paper:

(heIn <- round(as.numeric(colnames(crimtab)) / 2.54))
d.hei <- data.frame(height = rep(heIn, colSums(crimtab)))

# 2) shuffle the data:

set.seed(1)
d.hei <- d.hei[sample(1:3000), , drop = FALSE]

# 3) Make 750 samples each of size 4:

d.hei$sample <- as.factor(rep(1:750, each = 4))

# 4) Compute the means and standard deviations (n) for the 750 samples:

h.mean <- with(d.hei, tapply(height, sample, FUN = mean))
h.sd   <- with(d.hei, tapply(height, sample, FUN = sd)) * sqrt(3/4)

# 5) Compute the difference between the mean of each sample and
#    the mean of the population and then divide by the
#    standard deviation of the sample:

zobs <- (h.mean - mean(d.hei[,"height"]))/h.sd

# 6) Replace infinite values by +/- 6 as in Student's paper:

zobs[infZ <- is.infinite(zobs)] # none of them 
zobs[infZ] <- 6 * sign(zobs[infZ])

# 7) Plot the distribution:

require(grDevices); require(graphics)
hist(x = zobs, probability = TRUE, xlab = "Student's z",
     col = grey(0.8), border = grey(0.5),
     main = "Distribution of Student's z score  for 'crimtab' data")



cleanEx()
nameEx("discoveries")
### * discoveries

flush(stderr()); flush(stdout())

### Name: discoveries
### Title: Yearly Numbers of Important Discoveries
### Aliases: discoveries
### Keywords: datasets

### ** Examples

require(graphics)
plot(discoveries, ylab = "Number of important discoveries",
     las = 1)
title(main = "discoveries data set")



cleanEx()
nameEx("esoph")
### * esoph

flush(stderr()); flush(stdout())

### Name: esoph
### Title: Smoking, Alcohol and (O)esophageal Cancer
### Aliases: esoph
### Keywords: datasets

### ** Examples

require(stats)
require(graphics) # for mosaicplot
summary(esoph)
## effects of alcohol, tobacco and interaction, age-adjusted
model1 <- glm(cbind(ncases, ncontrols) ~ agegp + tobgp * alcgp,
              data = esoph, family = binomial())
anova(model1)
## Try a linear effect of alcohol and tobacco
model2 <- glm(cbind(ncases, ncontrols) ~ agegp + unclass(tobgp)
                                         + unclass(alcgp),
              data = esoph, family = binomial())
summary(model2)
## Re-arrange data for a mosaic plot
ttt <- table(esoph$agegp, esoph$alcgp, esoph$tobgp)
o <- with(esoph, order(tobgp, alcgp, agegp))
ttt[ttt == 1] <- esoph$ncases[o]
tt1 <- table(esoph$agegp, esoph$alcgp, esoph$tobgp)
tt1[tt1 == 1] <- esoph$ncontrols[o]
tt <- array(c(ttt, tt1), c(dim(ttt),2),
            c(dimnames(ttt), list(c("Cancer", "control"))))
mosaicplot(tt, main = "esoph data set", color = TRUE)



cleanEx()
nameEx("euro")
### * euro

flush(stderr()); flush(stdout())

### Name: euro
### Title: Conversion Rates of Euro Currencies
### Aliases: euro euro.cross
### Keywords: datasets

### ** Examples

cbind(euro)

## These relations hold:
euro == signif(euro, 6) # [6 digit precision in Euro's definition]
all(euro.cross == outer(1/euro, euro))

## Convert 20 Euro to Belgian Franc
20 * euro["BEF"]
## Convert 20 Austrian Schilling to Euro
20 / euro["ATS"]
## Convert 20 Spanish Pesetas to Italian Lira
20 * euro.cross["ESP", "ITL"]

require(graphics)
dotchart(euro,
         main = "euro data: 1 Euro in currency unit")
dotchart(1/euro,
         main = "euro data: 1 currency unit in Euros")
dotchart(log(euro, 10),
         main = "euro data: log10(1 Euro in currency unit)")



cleanEx()
nameEx("faithful")
### * faithful

flush(stderr()); flush(stdout())

### Name: faithful
### Title: Old Faithful Geyser Data
### Aliases: faithful
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
f.tit <-  "faithful data: Eruptions of Old Faithful"

ne60 <- round(e60 <- 60 * faithful$eruptions)
all.equal(e60, ne60)             # relative diff. ~ 1/10000
table(zapsmall(abs(e60 - ne60))) # 0, 0.02 or 0.04
faithful$better.eruptions <- ne60 / 60
te <- table(ne60)
te[te >= 4]                      # (too) many multiples of 5 !
plot(names(te), te, type = "h", main = f.tit, xlab = "Eruption time (sec)")

plot(faithful[, -3], main = f.tit,
     xlab = "Eruption time (min)",
     ylab = "Waiting time to next eruption (min)")
lines(lowess(faithful$eruptions, faithful$waiting, f = 2/3, iter = 3),
      col = "red")



cleanEx()
nameEx("freeny")
### * freeny

flush(stderr()); flush(stdout())

### Name: freeny
### Title: Freeny's Revenue Data
### Aliases: freeny freeny.x freeny.y
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
summary(freeny)
pairs(freeny, main = "freeny data")
# gives warning: freeny$y has class "ts"

summary(fm1 <- lm(y ~ ., data = freeny))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0),
            mar = c(4.1, 4.1, 2.1, 1.1))
plot(fm1)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("infert")
### * infert

flush(stderr()); flush(stdout())

### Name: infert
### Title: Infertility after Spontaneous and Induced Abortion
### Aliases: infert
### Keywords: datasets

### ** Examples

require(stats)
model1 <- glm(case ~ spontaneous+induced, data = infert, family = binomial())
summary(model1)
## adjusted for other potential confounders:
summary(model2 <- glm(case ~ age+parity+education+spontaneous+induced,
                     data = infert, family = binomial()))
## Really should be analysed by conditional logistic regression
## which is in the survival package



cleanEx()
nameEx("iris")
### * iris

flush(stderr()); flush(stdout())

### Name: iris
### Title: Edgar Anderson's Iris Data
### Aliases: iris iris3
### Keywords: datasets

### ** Examples

dni3 <- dimnames(iris3)
ii <- data.frame(matrix(aperm(iris3, c(1,3,2)), ncol = 4,
                        dimnames = list(NULL, sub(" L.",".Length",
                                        sub(" W.",".Width", dni3[[2]])))),
    Species = gl(3, 50, labels = sub("S", "s", sub("V", "v", dni3[[3]]))))
all.equal(ii, iris) # TRUE



cleanEx()
nameEx("islands")
### * islands

flush(stderr()); flush(stdout())

### Name: islands
### Title: Areas of the World's Major Landmasses
### Aliases: islands
### Keywords: datasets

### ** Examples

require(graphics)
dotchart(log(islands, 10),
   main = "islands data: log10(area) (log10(sq. miles))")
dotchart(log(islands[order(islands)], 10),
   main = "islands data: log10(area) (log10(sq. miles))")



cleanEx()
nameEx("longley")
### * longley

flush(stderr()); flush(stdout())

### Name: longley
### Title: Longley's Economic Regression Data
### Aliases: longley
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## give the data set in the form it is used in S-PLUS:
longley.x <- data.matrix(longley[, 1:6])
longley.y <- longley[, "Employed"]
pairs(longley, main = "longley data")
summary(fm1 <- lm(Employed ~ ., data = longley))
opar <- par(mfrow = c(2, 2), oma = c(0, 0, 1.1, 0),
            mar = c(4.1, 4.1, 2.1, 1.1))
plot(fm1)
par(opar)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("morley")
### * morley

flush(stderr()); flush(stdout())

### Name: morley
### Title: Michelson Speed of Light Data
### Aliases: morley
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
michelson <- transform(morley,
                       Expt = factor(Expt), Run = factor(Run))
xtabs(~ Expt + Run, data = michelson)  # 5 x 20 balanced (two-way)
plot(Speed ~ Expt, data = michelson,
     main = "Speed of Light Data", xlab = "Experiment No.")
fm <- aov(Speed ~ Run + Expt, data = michelson)
summary(fm)
fm0 <- update(fm, . ~ . - Run)
anova(fm0, fm)



cleanEx()
nameEx("mtcars")
### * mtcars

flush(stderr()); flush(stdout())

### Name: mtcars
### Title: Motor Trend Car Road Tests
### Aliases: mtcars
### Keywords: datasets

### ** Examples

require(graphics)
pairs(mtcars, main = "mtcars data", gap = 1/4)
coplot(mpg ~ disp | as.factor(cyl), data = mtcars,
       panel = panel.smooth, rows = 1)
## possibly more meaningful, e.g., for summary() or bivariate plots:
mtcars2 <- within(mtcars, {
   vs <- factor(vs, labels = c("V", "S"))
   am <- factor(am, labels = c("automatic", "manual"))
   cyl  <- ordered(cyl)
   gear <- ordered(gear)
   carb <- ordered(carb)
})
summary(mtcars2)



cleanEx()
nameEx("nhtemp")
### * nhtemp

flush(stderr()); flush(stdout())

### Name: nhtemp
### Title: Average Yearly Temperatures in New Haven
### Aliases: nhtemp
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
plot(nhtemp, main = "nhtemp data",
  ylab = "Mean annual temperature in New Haven, CT (deg. F)")



cleanEx()
nameEx("nottem")
### * nottem

flush(stderr()); flush(stdout())

### Name: nottem
### Title: Average Monthly Temperatures at Nottingham, 1920-1939
### Aliases: nottem
### Keywords: datasets

### ** Examples



cleanEx()
nameEx("npk")
### * npk

flush(stderr()); flush(stdout())

### Name: npk
### Title: Classical N, P, K Factorial Experiment
### Aliases: npk
### Keywords: datasets

### ** Examples


cleanEx()
nameEx("occupationalStatus")
### * occupationalStatus

flush(stderr()); flush(stdout())

### Name: occupationalStatus
### Title: Occupational Status of Fathers and their Sons
### Aliases: occupationalStatus
### Keywords: datasets

### ** Examples

require(stats); require(graphics)

plot(occupationalStatus)

##  Fit a uniform association model separating diagonal effects
Diag <- as.factor(diag(1:8))
Rscore <- scale(as.numeric(row(occupationalStatus)), scale = FALSE)
Cscore <- scale(as.numeric(col(occupationalStatus)), scale = FALSE)
modUnif <- glm(Freq ~ origin + destination + Diag + Rscore:Cscore,
               family = poisson, data = occupationalStatus)

summary(modUnif)
plot(modUnif) # 4 plots, with warning about  h_ii ~= 1



cleanEx()
nameEx("precip")
### * precip

flush(stderr()); flush(stdout())

### Name: precip
### Title: Annual Precipitation in US Cities
### Aliases: precip
### Keywords: datasets

### ** Examples

require(graphics)
dotchart(precip[order(precip)], main = "precip data")
title(sub = "Average annual precipitation (in.)")

## Old ("wrong") version of dataset (just name change):
precip.O <- local({
   p <- precip; names(p)[names(p) == "Cincinnati"] <- "Cincinati" ; p })
stopifnot(all(precip == precip.O),
	  match("Cincinnati", names(precip)) == 46,
	  identical(names(precip)[-46], names(precip.O)[-46]))



cleanEx()
nameEx("presidents")
### * presidents

flush(stderr()); flush(stdout())

### Name: presidents
### Title: Quarterly Approval Ratings of US Presidents
### Aliases: presidents
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
plot(presidents, las = 1, ylab = "Approval rating (%)",
     main = "presidents data")



cleanEx()
nameEx("pressure")
### * pressure

flush(stderr()); flush(stdout())

### Name: pressure
### Title: Vapor Pressure of Mercury as a Function of Temperature
### Aliases: pressure
### Keywords: datasets

### ** Examples

require(graphics)
plot(pressure, xlab = "Temperature (deg C)",
     ylab = "Pressure (mm of Hg)",
     main = "pressure data: Vapor Pressure of Mercury")
plot(pressure, xlab = "Temperature (deg C)",  log = "y",
     ylab = "Pressure (mm of Hg)",
     main = "pressure data: Vapor Pressure of Mercury")



cleanEx()
nameEx("quakes")
### * quakes

flush(stderr()); flush(stdout())

### Name: quakes
### Title: Locations of Earthquakes off Fiji
### Aliases: quakes
### Keywords: datasets

### ** Examples

require(graphics)
pairs(quakes, main = "Fiji Earthquakes, N = 1000", cex.main = 1.2, pch = ".")



cleanEx()
nameEx("randu")
### * randu

flush(stderr()); flush(stdout())

### Name: randu
### Title: Random Numbers from Congruential Generator RANDU
### Aliases: randu
### Keywords: datasets

### ** Examples




cleanEx()
nameEx("sleep")
### * sleep

flush(stderr()); flush(stdout())

### Name: sleep
### Title: Student's Sleep Data
### Aliases: sleep
### Keywords: datasets

### ** Examples

require(stats)
## Student's paired t-test
with(sleep,
     t.test(extra[group == 1],
            extra[group == 2], paired = TRUE))

## The sleep *prolongations*
sleep1 <- with(sleep, extra[group == 2] - extra[group == 1])
summary(sleep1)
stripchart(sleep1, method = "stack", xlab = "hours",
           main = "Sleep prolongation (n = 10)")
boxplot(sleep1, horizontal = TRUE, add = TRUE,
        at = .6, pars = list(boxwex = 0.5, staplewex = 0.25))



cleanEx()
nameEx("stackloss")
### * stackloss

flush(stderr()); flush(stdout())

### Name: stackloss
### Title: Brownlee's Stack Loss Plant Data
### Aliases: stackloss stack.loss stack.x
### Keywords: datasets

### ** Examples

require(stats)
summary(lm.stack <- lm(stack.loss ~ stack.x))



cleanEx()
nameEx("sunspot.month")
### * sunspot.month

flush(stderr()); flush(stdout())

### Name: sunspot.month
### Title: Monthly Sunspot Data, from 1749 to "Present"
### Aliases: sunspot.month
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## Compare the monthly series
plot (sunspot.month,
      main="sunspot.month & sunspots [package'datasets']", col=2)
lines(sunspots) # -> faint differences where they overlap

## Now look at the difference :
all(tsp(sunspots)     [c(1,3)] ==
    tsp(sunspot.month)[c(1,3)]) ## Start & Periodicity are the same
n1 <- length(sunspots)
table(eq <- sunspots == sunspot.month[1:n1]) #>  132  are different !
i <- which(!eq)
rug(time(eq)[i])
s1 <- sunspots[i] ; s2 <- sunspot.month[i]
cbind(i = i, time = time(sunspots)[i], sunspots = s1, ss.month = s2,
      perc.diff = round(100*2*abs(s1-s2)/(s1+s2), 1))

## How to recreate the "old" sunspot.month (R <= 3.0.3):
.sunspot.diff <- cbind(
    i = c(1202L, 1256L, 1258L, 1301L, 1407L, 1429L, 1452L, 1455L,
          1663L, 2151L, 2329L, 2498L, 2594L, 2694L, 2819L),
    res10 = c(1L, 1L, 1L, -1L, -1L, -1L, 1L, -1L,
          1L, 1L, 1L, 1L, 1L, 20L, 1L))
ssm0 <- sunspot.month[1:2988]
with(as.data.frame(.sunspot.diff), ssm0[i] <<- ssm0[i] - res10/10)
sunspot.month.0 <- ts(ssm0, start = 1749, frequency = 12)



cleanEx()
nameEx("sunspot.year")
### * sunspot.year

flush(stderr()); flush(stdout())

### Name: sunspot.year
### Title: Yearly Sunspot Data, 1700-1988
### Aliases: sunspot.year
### Keywords: datasets

### ** Examples

utils::str(sm <- sunspots)# the monthly version we keep unchanged
utils::str(sy <- sunspot.year)
## The common time interval
(t1 <- c(max(start(sm), start(sy)),     1)) # Jan 1749
(t2 <- c(min(  end(sm)[1],end(sy)[1]), 12)) # Dec 1983
s.m <- window(sm, start=t1, end=t2)
s.y <- window(sy, start=t1, end=t2[1]) # {irrelevant warning}
stopifnot(length(s.y) * 12 == length(s.m),
          ## The yearly series *is* close to the averages of the monthly one:
          all.equal(s.y, aggregate(s.m, FUN = mean), tolerance = 0.0020))
## NOTE: Strangely, correctly weighting the number of days per month
##       (using 28.25 for February) is *not* closer than the simple mean:
ndays <- c(31, 28.25, rep(c(31,30, 31,30, 31), 2))
all.equal(s.y, aggregate(s.m, FUN = mean))                     # 0.0013
all.equal(s.y, aggregate(s.m, FUN = weighted.mean, w = ndays)) # 0.0017



cleanEx()
nameEx("sunspots")
### * sunspots

flush(stderr()); flush(stdout())

### Name: sunspots
### Title: Monthly Sunspot Numbers, 1749-1983
### Aliases: sunspots
### Keywords: datasets

### ** Examples

require(graphics)
plot(sunspots, main = "sunspots data", xlab = "Year",
     ylab = "Monthly sunspot numbers")



cleanEx()
nameEx("swiss")
### * swiss

flush(stderr()); flush(stdout())

### Name: swiss
### Title: Swiss Fertility and Socioeconomic Indicators (1888) Data
### Aliases: swiss
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
pairs(swiss, panel = panel.smooth, main = "swiss data",
      col = 3 + (swiss$Catholic > 50))
summary(lm(Fertility ~ . , data = swiss))



cleanEx()
nameEx("trees")
### * trees

flush(stderr()); flush(stdout())

### Name: trees
### Title: Diameter, Height and Volume for Black Cherry Trees
### Aliases: trees
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
pairs(trees, panel = panel.smooth, main = "trees data")
plot(Volume ~ Girth, data = trees, log = "xy")
coplot(log(Volume) ~ log(Girth) | Height, data = trees,
       panel = panel.smooth)
summary(fm1 <- lm(log(Volume) ~ log(Girth), data = trees))
summary(fm2 <- update(fm1, ~ . + log(Height), data = trees))
step(fm2)
## i.e., Volume ~= c * Height * Girth^2  seems reasonable



cleanEx()
nameEx("uspop")
### * uspop

flush(stderr()); flush(stdout())

### Name: uspop
### Title: Populations Recorded by the US Census
### Aliases: uspop
### Keywords: datasets

### ** Examples

require(graphics)
plot(uspop, log = "y", main = "uspop data", xlab = "Year",
     ylab = "U.S. Population (millions)")



cleanEx()
nameEx("volcano")
### * volcano

flush(stderr()); flush(stdout())

### Name: volcano
### Title: Topographic Information on Auckland's Maunga Whau Volcano
### Aliases: volcano
### Keywords: datasets

### ** Examples

require(grDevices); require(graphics)
filled.contour(volcano, color.palette = terrain.colors, asp = 1)
title(main = "volcano data: filled contour map")



cleanEx()
nameEx("warpbreaks")
### * warpbreaks

flush(stderr()); flush(stdout())

### Name: warpbreaks
### Title: The Number of Breaks in Yarn during Weaving
### Aliases: warpbreaks
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
summary(warpbreaks)
opar <- par(mfrow = c(1, 2), oma = c(0, 0, 1.1, 0))
plot(breaks ~ tension, data = warpbreaks, col = "lightgray",
     varwidth = TRUE, subset = wool == "A", main = "Wool A")
plot(breaks ~ tension, data = warpbreaks, col = "lightgray",
     varwidth = TRUE, subset = wool == "B", main = "Wool B")
mtext("warpbreaks data", side = 3, outer = TRUE)
par(opar)
summary(fm1 <- lm(breaks ~ wool*tension, data = warpbreaks))
anova(fm1)



graphics::par(get("par.postscript", pos = 'CheckExEnv'))
cleanEx()
nameEx("women")
### * women

flush(stderr()); flush(stdout())

### Name: women
### Title: Average Heights and Weights for American Women
### Aliases: women
### Keywords: datasets

### ** Examples

require(graphics)
plot(women, xlab = "Height (in)", ylab = "Weight (lb)",
     main = "women data: American women aged 30-39")



cleanEx()
nameEx("zCO2")
### * zCO2

flush(stderr()); flush(stdout())

### Name: CO2
### Title: Carbon Dioxide Uptake in Grass Plants
### Aliases: CO2
### Keywords: datasets

### ** Examples

require(stats); require(graphics)
## Don't show: 
options(show.nls.convergence=FALSE)
## End(Don't show)
coplot(uptake ~ conc | Plant, data = CO2, show.given = FALSE, type = "b")
## fit the data for the first plant
fm1 <- nls(uptake ~ SSasymp(conc, Asym, lrc, c0),
   data = CO2, subset = Plant == "Qn1")
summary(fm1)
## fit each plant separately
fmlist <- list()
for (pp in levels(CO2$Plant)) {
  fmlist[[pp]] <- nls(uptake ~ SSasymp(conc, Asym, lrc, c0),
      data = CO2, subset = Plant == pp)
}
## check the coefficients by plant
print(sapply(fmlist, coef), digits = 3)
