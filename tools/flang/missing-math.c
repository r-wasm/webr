#include <stdint.h>
#include <complex.h>
#include <math.h>

double __fd_asin_1(double x) {
  return asin(x);
}

double __fd_acos_1(double x) {
  return acos(x);
}

double __fd_atan_1(double x) {
  return atan(x);
}

double __fd_mod_1(double x, double y) {
  return fmod(x, y);
}

double __fd_atan2_1(double y, double x) {
  return atan2(y, x);
}

double complex __fz_sqrt_1(double complex x) {
  return csqrt(x);
}

double __mth_i_dhypot(double x, double y) {
  return hypot(x, y);
}

#define GFC_COMPLEX_8 double complex
#define GFC_INTEGER_4 int32_t
#define GFC_UINTEGER_4 uint32_t
#define pow_c8_i4 __fz_powi_1

// From https://github.com/gcc-mirror/gcc/blob/master/libgfortran/generated/pow_c8_i4.c
GFC_COMPLEX_8
pow_c8_i4 (GFC_COMPLEX_8 a, GFC_INTEGER_4 b)
{
  GFC_COMPLEX_8 pow, x;
  GFC_INTEGER_4 n;
  GFC_UINTEGER_4 u;

  n = b;
  x = a;
  pow = 1;
  if (n != 0)
    {
      if (n < 0)
	{

	  u = -n;
	  x = pow / x;
	}
      else
	{
	   u = n;
	}
      for (;;)
	{
	  if (u & 1)
	    pow *= x;
	  u >>= 1;
	  if (u)
	    x *= x;
	  else
	    break;
	}
    }
  return pow;
}

// From https://github.com/flang-compiler/flang/blob/4bb8c37601972aa2ca0e5b74a842b1affb0dfdee/runtime/libpgmath/lib/common/ipowi.c
int __mth_i_ipowi(int x, int i)
{
  int f;


  /* special cases */


  if (x == 2) {
    if (i >= 0)
      return 1 << i;
    return 0;
  }
  if (i < 0) {
    if (x == 1)
      return 1;
    if (x == -1) {
      if (i & 1)
        return -1;
      return 1;
    }
    return 0;
  }


  if (i == 0)
    return 1;
  f = 1;
  while (1) {
    if (i & 1)
      f *= x;
    i >>= 1;
    if (i == 0)
      return f;
    x *= x;
  }
}
