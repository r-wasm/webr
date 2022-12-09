#!/usr/bin/env bash
set -eux

cd ${SOURCE}/flang/runtime

em++ ${CXXFLAGS} -c ISO_Fortran_binding.cpp -o ISO_Fortran_binding.o
em++ ${CXXFLAGS} -c allocatable.cpp -o allocatable.o
em++ ${CXXFLAGS} -c assign.cpp -o assign.o
em++ ${CXXFLAGS} -c buffer.cpp -o buffer.o
em++ ${CXXFLAGS} -c command.cpp -o command.o
# Conflicting types
# emcc ${CFLAGS}   -c complex-reduction.c -o complex-reduction.o
em++ ${CXXFLAGS} -c copy.cpp -o copy.o
em++ ${CXXFLAGS} -c character.cpp -o character.o
em++ ${CXXFLAGS} -c connection.cpp -o connection.o
em++ ${CXXFLAGS} -c derived.cpp -o derived.o
em++ ${CXXFLAGS} -c derived-api.cpp -o derived-api.o
em++ ${CXXFLAGS} -c descriptor.cpp -o descriptor.o
em++ ${CXXFLAGS} -c descriptor-io.cpp -o descriptor-io.o
em++ ${CXXFLAGS} -c dot-product.cpp -o dot-product.o
em++ ${CXXFLAGS} -c edit-input.cpp -o edit-input.o
em++ ${CXXFLAGS} -c edit-output.cpp -o edit-output.o
em++ ${CXXFLAGS} -c environment.cpp -o environment.o
em++ ${CXXFLAGS} -c extensions.cpp -o extensions.o
em++ ${CXXFLAGS} -c extrema.cpp -o extrema.o
em++ ${CXXFLAGS} -c file.cpp -o file.o
em++ ${CXXFLAGS} -c findloc.cpp -o findloc.o
em++ ${CXXFLAGS} -c format.cpp -o format.o
em++ ${CXXFLAGS} -c inquiry.cpp -o inquiry.o
em++ ${CXXFLAGS} -c internal-unit.cpp -o internal-unit.o
em++ ${CXXFLAGS} -c iostat.cpp -o iostat.o
em++ ${CXXFLAGS} -c io-api.cpp -o io-api.o
em++ ${CXXFLAGS} -c io-error.cpp -o io-error.o
em++ ${CXXFLAGS} -c io-stmt.cpp -o io-stmt.o
em++ ${CXXFLAGS} -c main.cpp -o main.o
em++ ${CXXFLAGS} -c matmul.cpp -o matmul.o
em++ ${CXXFLAGS} -c memory.cpp -o memory.o
em++ ${CXXFLAGS} -c misc-intrinsic.cpp -o misc-intrinsic.o
em++ ${CXXFLAGS} -c namelist.cpp -o namelist.o
em++ ${CXXFLAGS} -c numeric.cpp -o numeric.o
em++ ${CXXFLAGS} -c ragged.cpp -o ragged.o
em++ ${CXXFLAGS} -c random.cpp -o random.o
em++ ${CXXFLAGS} -c reduction.cpp -o reduction.o
em++ ${CXXFLAGS} -c pointer.cpp -o pointer.o
em++ ${CXXFLAGS} -c product.cpp -o product.o
em++ ${CXXFLAGS} -c stat.cpp -o stat.o
# Needs `FE_DIVBYZERO` macro
# em++ ${CXXFLAGS} -c stop.cpp -o stop.o
em++ ${CXXFLAGS} -c sum.cpp -o sum.o
em++ ${CXXFLAGS} -c support.cpp -o support.o
em++ ${CXXFLAGS} -c terminator.cpp -o terminator.o
em++ ${CXXFLAGS} -c time-intrinsic.cpp -o time-intrinsic.o
em++ ${CXXFLAGS} -c tools.cpp -o tools.o
em++ ${CXXFLAGS} -c transformational.cpp -o transformational.o
em++ ${CXXFLAGS} -c type-code.cpp -o type-code.o
em++ ${CXXFLAGS} -c type-info.cpp -o type-info.o
em++ ${CXXFLAGS} -c unit.cpp -o unit.o
em++ ${CXXFLAGS} -c unit-map.cpp -o unit-map.o
em++ ${CXXFLAGS} -c utf.cpp -o utf.o

em++ ${CXXFLAGS} -c ${SOURCE}/flang/lib/Decimal/decimal-to-binary.cpp -o decimal-to-binary.o
em++ ${CXXFLAGS} -c ${SOURCE}/flang/lib/Decimal/binary-to-decimal.cpp -o binary-to-decimal.o

emcc ${CFLAGS} -c ${ROOT}/missing-math.c -o missing-math.o

mkdir -p ${BUILD}/webr/
rm -f ${BUILD}/webr/libFortranRuntime.a

emar -cr ${BUILD}/webr/libFortranRuntime.a \
  ISO_Fortran_binding.o allocatable.o assign.o buffer.o command.o \
  copy.o character.o connection.o derived.o \
  derived-api.o descriptor.o descriptor-io.o dot-product.o edit-input.o \
  edit-output.o environment.o extensions.o extrema.o file.o findloc.o \
  format.o inquiry.o internal-unit.o iostat.o io-api.o io-error.o \
  io-stmt.o main.o matmul.o memory.o misc-intrinsic.o namelist.o \
  numeric.o ragged.o random.o reduction.o pointer.o product.o stat.o \
  sum.o support.o terminator.o time-intrinsic.o tools.o transformational.o \
  type-code.o type-info.o unit.o unit-map.o utf.o \
  binary-to-decimal.o decimal-to-binary.o missing-math.o
